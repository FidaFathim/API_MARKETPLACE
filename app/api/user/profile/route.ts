import { NextRequest, NextResponse } from 'next/server';

// Mock user profile storage (in a real app, use a database)
const userProfiles: Record<string, { githubLink?: string }> = {};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const profile = userProfiles[userId] || {};
  return NextResponse.json(profile);
}

export async function POST(request: NextRequest) {
  try {
    const { userId, githubLink } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Store or update user profile
    if (!userProfiles[userId]) {
      userProfiles[userId] = {};
    }
    
    if (githubLink !== undefined) {
      userProfiles[userId].githubLink = githubLink;
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile: userProfiles[userId]
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
