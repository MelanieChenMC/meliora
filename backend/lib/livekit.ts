import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { v4 as uuidv4 } from 'uuid'

const livekitHost = process.env.LIVEKIT_URL!
const apiKey = process.env.LIVEKIT_API_KEY!
const apiSecret = process.env.LIVEKIT_API_SECRET!

export const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

export function generateAccessToken(roomName: string, participantName: string, isBot = false) {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: 3600, // 1 hour
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: !isBot,
    canSubscribe: true,
    canPublishData: true,
  })

  return at.toJwt()
}

export async function createRoom(sessionId: string, scenarioType: string) {
  const roomName = `${scenarioType}-${sessionId}`
  
  try {
    await roomService.createRoom({
      name: roomName,
      maxParticipants: 10,
      emptyTimeout: 300, // 5 minutes
    })
    
    return roomName
  } catch (error) {
    console.error('Error creating room:', error)
    throw error
  }
}

export async function addBotToRoom(roomName: string) {
  const botParticipantName = `ai-bot-${uuidv4()}`
  const botToken = generateAccessToken(roomName, botParticipantName, true)
  
  // In a real implementation, you'd trigger your bot service here
  // For now, we'll return the token for manual bot connection
  
  return {
    participantName: botParticipantName,
    token: botToken
  }
} 