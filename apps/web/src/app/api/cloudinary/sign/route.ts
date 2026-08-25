import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@brnit/auth'
import { cloudinary } from '@/lib/cloudinary'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import { logger } from '@/lib/server-logger'

async function postHandler(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { timestamp, folder } = body

    const paramsToSign: Record<string, string | number> = {
      timestamp: timestamp || Math.floor(Date.now() / 1000),
    }

    if (folder) {
      paramsToSign.folder = folder
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    )

    return NextResponse.json({
      signature,
      timestamp: paramsToSign.timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    })
  } catch (error) {
    logger.error('Error generating Cloudinary signature', { err: error })
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    )
  }
}

export const POST = withRequestLogging(postHandler, {
  actionName: 'CloudinarySign',
})
