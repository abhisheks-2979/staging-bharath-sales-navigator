import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify admin role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid token')
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const {
      email,
      password,
      username,
      full_name,
      phone_number,
      recovery_email,
      hint_question,
      hint_answer,
      monthly_salary,
      daily_da_allowance,
      manager_id,
      hq,
      date_of_joining,
      date_of_exit,
      alternate_email,
      address,
      education,
      emergency_contact_number
    } = await req.json()

    console.log('Creating user with email:', email)

    // Create the auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        username,
        full_name,
        phone_number,
        recovery_email,
        hint_question,
        hint_answer
      },
      email_confirm: true
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      throw authError
    }

    if (!authUser.user) {
      throw new Error('User creation failed')
    }

    console.log('Auth user created:', authUser.user.id)

    // Create employee record
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: authUser.user.id,
        monthly_salary: monthly_salary || 0,
        daily_da_allowance: daily_da_allowance || 0,
        manager_id: manager_id || null,
        hq: hq || null,
        date_of_joining: date_of_joining || null,
        date_of_exit: date_of_exit || null,
        alternate_email: alternate_email || null,
        address: address || null,
        education: education || null,
        emergency_contact_number: emergency_contact_number || null
      })

    if (employeeError) {
      console.error('Employee creation error:', employeeError)
      // Clean up auth user if employee creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw employeeError
    }

    console.log('Employee record created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          username,
          full_name
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating user:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create user' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})