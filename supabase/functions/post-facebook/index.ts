// post-facebook edge function
// Publishes a post to Facebook page via Meta Graph API with audit logging.
// Requires FACEBOOK_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID env vars.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://luckystore1947.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FacebookPostRequest {
  message?: string
  link?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Auth client: use anon key for getUser
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    // Admin client: use service role for DB writes
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify auth — require valid JWT with user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid Bearer token required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Fetch internal user profile for tenant/store context
    const { data: userProfile, error: profileError } = await adminClient
      .from('users')
      .select('id, tenant_id, store_id, role')
      .eq('auth_id', user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('User profile not found:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Parse and validate body
    let body: FacebookPostRequest
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate message
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'message is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const normalizedMessage = body.message.replace(/\s+/g, ' ').trim()
    if (normalizedMessage.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'message cannot be empty' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    if (normalizedMessage.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'message exceeds 5000 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate link if provided
    let normalizedLink: string | null = null
    if (body.link !== undefined && body.link !== null) {
      if (typeof body.link !== 'string' || body.link.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'link must be a valid URL string' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      try {
        const url = new URL(body.link.trim())
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error('Invalid protocol')
        }
        normalizedLink = body.link.trim()
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'link must be a valid URL with http or https protocol' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    const systemToken = Deno.env.get('FACEBOOK_SYSTEM_USER_TOKEN')
    const facebookPageId = Deno.env.get('FACEBOOK_PAGE_ID')

    if (!systemToken || !facebookPageId) {
      console.error('Facebook credentials not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Facebook integration not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Step 1: Insert pending row into social_posts BEFORE calling Facebook
    const { data: insertedRow, error: insertError } = await adminClient
      .from('social_posts')
      .insert({
        tenant_id: userProfile.tenant_id,
        store_id: userProfile.store_id,
        user_id: userProfile.id,
        platform: 'facebook',
        content: normalizedMessage,
        link: normalizedLink,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError || !insertedRow) {
      console.error('Failed to insert pending social post:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create audit record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const postDbId = insertedRow.id

    // Step 2: Derive page access token
    const accountsRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(systemToken)}`
    )
    const accountsData = await accountsRes.json()

    if (!accountsRes.ok) {
      const errorMsg = accountsData?.error?.message || 'Failed to fetch Facebook accounts'
      console.error('Facebook accounts error:', accountsData)
      await adminClient.from('social_posts').update({
        status: 'failed',
        error_message: errorMsg,
      }).eq('id', postDbId)

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    const page = accountsData?.data?.find(
      (p: { id?: string }) => p.id === facebookPageId
    )

    if (!page || !page.access_token) {
      const errorMsg = `Page ${facebookPageId} not found in accounts`
      console.error(errorMsg, accountsData)
      await adminClient.from('social_posts').update({
        status: 'failed',
        error_message: errorMsg,
      }).eq('id', postDbId)

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    const pageAccessToken = page.access_token

    // Step 3: Publish to Facebook
    const fbBody: Record<string, string> = { message: normalizedMessage }
    if (normalizedLink) {
      fbBody.link = normalizedLink
    }

    const fbRes = await fetch(
      `https://graph.facebook.com/v18.0/${facebookPageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fbBody),
      }
    )

    const fbResult = await fbRes.json()

    if (!fbRes.ok) {
      const errorMsg = fbResult?.error?.message || 'Failed to publish to Facebook'
      console.error('Facebook publish error:', fbResult)
      await adminClient.from('social_posts').update({
        status: 'failed',
        error_message: errorMsg,
      }).eq('id', postDbId)

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    // Step 4: Update row to published
    const fbPostId = fbResult?.id
    if (!fbPostId) {
      console.error('Facebook publish succeeded but no post id returned:', fbResult)
      await adminClient.from('social_posts').update({
        status: 'failed',
        error_message: 'Facebook publish succeeded but no post id returned',
      }).eq('id', postDbId)

      return new Response(
        JSON.stringify({ success: false, error: 'Facebook publish succeeded but no post id returned' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    await adminClient.from('social_posts').update({
      status: 'published',
      post_id: fbPostId,
    }).eq('id', postDbId)

    return new Response(
      JSON.stringify({ success: true, post_id: fbPostId, id: postDbId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('post-facebook error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
