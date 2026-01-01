import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetailerScore {
  retailer_id: string;
  retailer_name: string;
  beat_id: string;
  beat_name: string;
  priority_score: number;
  reasons: string[];
  days_since_last_visit: number;
  pending_amount: number;
  potential: string;
  avg_order_value: number;
}

interface DayPlan {
  day: string;
  date: string;
  beat_id: string;
  beat_name: string;
  retailers: RetailerScore[];
  estimated_value: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for scheduled jobs (no user auth)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, forceRegenerate } = await req.json().catch(() => ({}));
    
    console.log('🗓️ Starting auto-generate-beat-plan', { userId, forceRegenerate });

    // Get all active users or specific user
    let usersQuery = supabaseClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('is_active', true);
    
    if (userId) {
      usersQuery = usersQuery.eq('id', userId);
    }

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw usersError;

    console.log(`📊 Processing ${users?.length || 0} users`);

    const results = [];
    const weekStart = getNextWeekStart();
    const weekDays = getWeekDays(weekStart);

    for (const user of users || []) {
      try {
        console.log(`👤 Generating plan for user: ${user.full_name} (${user.id})`);
        
        // Check if plans already exist for this week (unless force regenerate)
        if (!forceRegenerate) {
          const { data: existingPlans } = await supabaseClient
            .from('beat_plans')
            .select('id')
            .eq('user_id', user.id)
            .gte('plan_date', weekDays[0].date)
            .lte('plan_date', weekDays[5].date)
            .limit(1);

          if (existingPlans && existingPlans.length > 0) {
            console.log(`⏭️ Skipping ${user.full_name} - plans already exist for this week`);
            results.push({ userId: user.id, status: 'skipped', reason: 'Plans already exist' });
            continue;
          }
        }

        // Fetch user's beats
        const { data: beats } = await supabaseClient
          .from('beats')
          .select('*')
          .eq('created_by', user.id)
          .eq('is_active', true);

        if (!beats || beats.length === 0) {
          console.log(`⚠️ No active beats for ${user.full_name}`);
          results.push({ userId: user.id, status: 'skipped', reason: 'No active beats' });
          continue;
        }

        // Fetch user's retailers with scoring data
        const { data: retailers } = await supabaseClient
          .from('retailers')
          .select('id, name, beat_id, beat_name, potential, pending_amount, last_visit_date, order_value, priority, status')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (!retailers || retailers.length === 0) {
          console.log(`⚠️ No active retailers for ${user.full_name}`);
          results.push({ userId: user.id, status: 'skipped', reason: 'No active retailers' });
          continue;
        }

        // Fetch recent orders for order pattern analysis
        const { data: recentOrders } = await supabaseClient
          .from('orders')
          .select('retailer_id, total_amount, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        // Fetch recent visits for visit pattern analysis
        const { data: recentVisits } = await supabaseClient
          .from('visits')
          .select('retailer_id, status, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        // Fetch historical beat plans for pattern analysis
        const { data: historicalPlans } = await supabaseClient
          .from('beat_plans')
          .select('beat_id, plan_date')
          .eq('user_id', user.id)
          .gte('plan_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        // Score retailers
        const scoredRetailers = scoreRetailers(retailers, recentOrders || [], recentVisits || []);
        
        // Generate weekly plan
        const weeklyPlan = generateWeeklyPlan(
          beats,
          scoredRetailers,
          weekDays,
          historicalPlans || []
        );

        // Save beat plans to database
        const plansToInsert = weeklyPlan
          .filter(day => day.beat_id)
          .map(day => ({
            user_id: user.id,
            beat_id: day.beat_id,
            beat_name: day.beat_name,
            plan_date: day.date,
            beat_data: {
              auto_generated: true,
              generated_at: new Date().toISOString(),
              retailers: day.retailers.map(r => ({
                id: r.retailer_id,
                name: r.retailer_name,
                priority_score: r.priority_score,
                reasons: r.reasons,
              })),
              estimated_value: day.estimated_value,
            },
          }));

        if (plansToInsert.length > 0) {
          // Delete existing plans for this week if force regenerate
          if (forceRegenerate) {
            await supabaseClient
              .from('beat_plans')
              .delete()
              .eq('user_id', user.id)
              .gte('plan_date', weekDays[0].date)
              .lte('plan_date', weekDays[5].date);
          }

          const { error: insertError } = await supabaseClient
            .from('beat_plans')
            .insert(plansToInsert);

          if (insertError) {
            console.error(`❌ Error inserting plans for ${user.full_name}:`, insertError);
            results.push({ userId: user.id, status: 'error', error: insertError.message });
            continue;
          }

          console.log(`✅ Created ${plansToInsert.length} beat plans for ${user.full_name}`);
          
          // Log the autonomous action
          await supabaseClient
            .from('ai_autonomous_actions')
            .insert({
              user_id: user.id,
              action_type: 'auto_beat_plan',
              action_data: {
                week_start: weekDays[0].date,
                plans_created: plansToInsert.length,
                total_retailers: plansToInsert.reduce((acc, p) => acc + (p.beat_data.retailers?.length || 0), 0),
                estimated_value: plansToInsert.reduce((acc, p) => acc + (p.beat_data.estimated_value || 0), 0),
              },
              status: 'executed',
              executed_at: new Date().toISOString(),
              can_undo: true,
              undo_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }).catch(err => console.log('Could not log autonomous action:', err));

          results.push({ 
            userId: user.id, 
            userName: user.full_name,
            status: 'success', 
            plansCreated: plansToInsert.length,
            weekStart: weekDays[0].date,
          });
        } else {
          results.push({ userId: user.id, status: 'skipped', reason: 'No plans generated' });
        }

      } catch (userError: any) {
        console.error(`❌ Error processing user ${user.id}:`, userError);
        results.push({ userId: user.id, status: 'error', error: userError.message });
      }
    }

    console.log('🏁 Auto-generate-beat-plan completed', { 
      totalUsers: users?.length || 0,
      successful: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      summary: {
        totalUsers: users?.length || 0,
        successful: results.filter(r => r.status === 'success').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        errors: results.filter(r => r.status === 'error').length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Fatal error in auto-generate-beat-plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Get next Monday's date
function getNextWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

// Get array of weekdays (Monday to Saturday)
function getWeekDays(weekStart: Date): { day: string; date: string }[] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      day,
      date: date.toISOString().split('T')[0],
    };
  });
}

// Score retailers based on multiple factors
function scoreRetailers(
  retailers: any[],
  orders: any[],
  visits: any[]
): RetailerScore[] {
  const today = new Date();
  
  // Create order lookup by retailer
  const ordersByRetailer = orders.reduce((acc: any, order: any) => {
    if (!acc[order.retailer_id]) acc[order.retailer_id] = [];
    acc[order.retailer_id].push(order);
    return acc;
  }, {});

  // Create visit lookup by retailer
  const visitsByRetailer = visits.reduce((acc: any, visit: any) => {
    if (!acc[visit.retailer_id]) acc[visit.retailer_id] = [];
    acc[visit.retailer_id].push(visit);
    return acc;
  }, {});

  return retailers.map(retailer => {
    const reasons: string[] = [];
    let score = 50; // Base score

    // Factor 1: Days since last visit (0-30 points)
    const lastVisit = retailer.last_visit_date ? new Date(retailer.last_visit_date) : null;
    const daysSinceLastVisit = lastVisit 
      ? Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastVisit > 30) {
      score += 30;
      reasons.push(`Not visited in ${daysSinceLastVisit} days`);
    } else if (daysSinceLastVisit > 14) {
      score += 20;
      reasons.push(`Last visit ${daysSinceLastVisit} days ago`);
    } else if (daysSinceLastVisit > 7) {
      score += 10;
    }

    // Factor 2: Pending collections (0-25 points)
    const pendingAmount = Number(retailer.pending_amount) || 0;
    if (pendingAmount > 10000) {
      score += 25;
      reasons.push(`High pending: ₹${pendingAmount.toLocaleString()}`);
    } else if (pendingAmount > 5000) {
      score += 15;
      reasons.push(`Pending: ₹${pendingAmount.toLocaleString()}`);
    } else if (pendingAmount > 0) {
      score += 5;
    }

    // Factor 3: Potential level (0-20 points)
    const potential = retailer.potential?.toLowerCase() || 'medium';
    if (potential === 'high') {
      score += 20;
      reasons.push('High potential retailer');
    } else if (potential === 'medium') {
      score += 10;
    }

    // Factor 4: Order value and frequency (0-15 points)
    const retailerOrders = ordersByRetailer[retailer.id] || [];
    const avgOrderValue = retailerOrders.length > 0
      ? retailerOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) / retailerOrders.length
      : Number(retailer.order_value) || 0;

    if (avgOrderValue > 10000) {
      score += 15;
      reasons.push(`High value: ₹${Math.round(avgOrderValue).toLocaleString()} avg`);
    } else if (avgOrderValue > 5000) {
      score += 10;
    } else if (avgOrderValue > 1000) {
      score += 5;
    }

    // Factor 5: Priority flag (0-10 points)
    if (retailer.priority === 'high') {
      score += 10;
      if (!reasons.includes('High potential retailer')) {
        reasons.push('Marked as high priority');
      }
    }

    // Ensure at least one reason
    if (reasons.length === 0) {
      reasons.push('Regular visit schedule');
    }

    return {
      retailer_id: retailer.id,
      retailer_name: retailer.name,
      beat_id: retailer.beat_id,
      beat_name: retailer.beat_name || '',
      priority_score: Math.min(score, 100),
      reasons,
      days_since_last_visit: daysSinceLastVisit,
      pending_amount: pendingAmount,
      potential: retailer.potential || 'medium',
      avg_order_value: avgOrderValue,
    };
  });
}

// Generate optimized weekly plan
function generateWeeklyPlan(
  beats: any[],
  scoredRetailers: RetailerScore[],
  weekDays: { day: string; date: string }[],
  historicalPlans: any[]
): DayPlan[] {
  // Group retailers by beat
  const retailersByBeat: { [key: string]: RetailerScore[] } = {};
  scoredRetailers.forEach(retailer => {
    if (!retailersByBeat[retailer.beat_id]) {
      retailersByBeat[retailer.beat_id] = [];
    }
    retailersByBeat[retailer.beat_id].push(retailer);
  });

  // Sort retailers within each beat by priority score
  Object.keys(retailersByBeat).forEach(beatId => {
    retailersByBeat[beatId].sort((a, b) => b.priority_score - a.priority_score);
  });

  // Analyze historical patterns for optimal day assignment
  const beatDayPreference: { [key: string]: { [day: string]: number } } = {};
  historicalPlans.forEach(plan => {
    const dayOfWeek = new Date(plan.plan_date).getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    if (!beatDayPreference[plan.beat_id]) {
      beatDayPreference[plan.beat_id] = {};
    }
    beatDayPreference[plan.beat_id][dayName] = (beatDayPreference[plan.beat_id][dayName] || 0) + 1;
  });

  // Score beats for prioritization
  const beatScores = beats.map(beat => {
    const beatRetailers = retailersByBeat[beat.beat_id] || [];
    const totalScore = beatRetailers.reduce((sum, r) => sum + r.priority_score, 0);
    const totalPending = beatRetailers.reduce((sum, r) => sum + r.pending_amount, 0);
    const totalValue = beatRetailers.reduce((sum, r) => sum + r.avg_order_value, 0);
    
    return {
      ...beat,
      retailerCount: beatRetailers.length,
      totalScore,
      totalPending,
      totalValue,
      avgScore: beatRetailers.length > 0 ? totalScore / beatRetailers.length : 0,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  // Assign beats to days (max 1 beat per day, prefer historical patterns)
  const weeklyPlan: DayPlan[] = [];
  const usedBeats = new Set<string>();

  weekDays.forEach(({ day, date }) => {
    // Find best beat for this day
    let bestBeat = null;
    let bestMatchScore = -1;

    for (const beat of beatScores) {
      if (usedBeats.has(beat.beat_id)) continue;
      if (beat.retailerCount === 0) continue;

      // Calculate match score based on historical preference
      let matchScore = beat.avgScore;
      const dayPrefs = beatDayPreference[beat.beat_id];
      if (dayPrefs && dayPrefs[day]) {
        matchScore += dayPrefs[day] * 5; // Bonus for historical pattern
      }

      if (matchScore > bestMatchScore) {
        bestMatchScore = matchScore;
        bestBeat = beat;
      }
    }

    if (bestBeat) {
      usedBeats.add(bestBeat.beat_id);
      const beatRetailers = retailersByBeat[bestBeat.beat_id] || [];
      
      // Take top retailers (max 15 per day for realistic visit count)
      const topRetailers = beatRetailers.slice(0, 15);
      
      weeklyPlan.push({
        day,
        date,
        beat_id: bestBeat.beat_id,
        beat_name: bestBeat.beat_name,
        retailers: topRetailers,
        estimated_value: topRetailers.reduce((sum, r) => sum + r.avg_order_value, 0),
      });
    } else {
      // No available beat for this day
      weeklyPlan.push({
        day,
        date,
        beat_id: '',
        beat_name: '',
        retailers: [],
        estimated_value: 0,
      });
    }
  });

  return weeklyPlan;
}
