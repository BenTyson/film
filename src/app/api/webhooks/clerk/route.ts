import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// Force this route to use Node.js runtime
export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Webhook verification failed', { status: 400 });
  }

  // Handle the webhook event
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      // Create user in our database
      const user = await prisma.users.create({
        data: {
          clerk_id: id,
          email: email_addresses[0].email_address,
          name: first_name && last_name ? `${first_name} ${last_name}` : first_name || null,
          role: 'user', // Default role
          updated_at: new Date()
        },
      });

      console.log('✅ User created in database:', user);

      return Response.json({
        success: true,
        message: 'User created',
        userId: user.id,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return Response.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      // Update user in our database
      const user = await prisma.users.update({
        where: { clerk_id: id },
        data: {
          email: email_addresses[0].email_address,
          name: first_name && last_name ? `${first_name} ${last_name}` : first_name || null,
        },
      });

      console.log('✅ User updated in database:', user);

      return Response.json({
        success: true,
        message: 'User updated',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return Response.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      // Delete user from our database (cascade will handle related records)
      await prisma.users.delete({
        where: { clerk_id: id },
      });

      console.log('✅ User deleted from database:', id);

      return Response.json({
        success: true,
        message: 'User deleted',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return Response.json(
        { success: false, error: 'Failed to delete user' },
        { status: 500 }
      );
    }
  }

  return Response.json({ success: true, message: 'Webhook received' });
}
