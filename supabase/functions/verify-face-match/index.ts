import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FaceMatchRequest {
  baselinePhotoUrl: string;
  attendancePhotoUrl: string;
}

interface FaceMatchResponse {
  status: 'match' | 'partial' | 'nomatch' | 'error';
  confidence: number;
  verified: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { baselinePhotoUrl, attendancePhotoUrl }: FaceMatchRequest = await req.json()

    if (!baselinePhotoUrl || !attendancePhotoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing photo URLs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the verification attempt
    console.log(`Face verification attempt by user ${user.id}`)

    // TODO: Implement actual face matching using a secure ML service
    // For now, return a simulated response with strict validation
    // In production, integrate with services like AWS Rekognition, Azure Face API, or similar
    
    // Simulated face matching (replace with real implementation)
    const simulatedConfidence = Math.random() * 100
    let status: 'match' | 'partial' | 'nomatch' | 'error'
    
    if (simulatedConfidence >= 80) {
      status = 'match'
    } else if (simulatedConfidence >= 50) {
      status = 'partial'
    } else {
      status = 'nomatch'
    }

    const result: FaceMatchResponse = {
      status,
      confidence: Math.round(simulatedConfidence * 100) / 100,
      verified: status === 'match' && simulatedConfidence >= 85
    }

    // Log successful verification
    await supabaseClient.from('sensitive_data_access_log').insert({
      user_id: user.id,
      table_name: 'attendance',
      action: `face_verification_${result.verified ? 'success' : 'failed'}`,
    })

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Face verification error:', err)
    return new Response(
      JSON.stringify({ error: 'Server error during face verification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
