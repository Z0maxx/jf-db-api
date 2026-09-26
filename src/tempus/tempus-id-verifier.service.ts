import { UserTempusIdStatus } from "#/db-entities/User"

type TempusUser = {
  steam64Id: string
  tempusId: number
}

type TempusPlayerInfo = {
  id: number
  steamid: string
}

const queue: {
  resolve: (status: "verified" | "failed") => void,
  user: TempusUser
}[] = []

const tempusApiTimeout = 1100

export async function verifyTempusIdAsync(user: TempusUser) {
  return new Promise<"verified" | "failed">((resolve) => {
    queue.push({
      resolve,
      user
    })
    if (queue.length === 1) {
      processQueue()
    }
  })
}

function processQueue() {
  let timeout = tempusApiTimeout
  const loop = setInterval(async () => {
    const item = queue[0]
    if (!item) {
      clearInterval(loop)
      return
    }

    const user = item.user
    const res = await fetch(`https://tempus2.xyz/api/v0/players/id/${user.tempusId}/info`)
    if (res.status === 429) {
      timeout = parseInt(res.headers.get("Retry-After")!) * 1000
      return
    }

    if (res.status === 404) {
      item.resolve(UserTempusIdStatus.FAILED)
    }
    else {
      const playerInfo = await res.json() as TempusPlayerInfo
      if (playerInfo.steamid === user.steam64Id) {
        item.resolve(UserTempusIdStatus.VERIFIED)
      }
      else {
        item.resolve(UserTempusIdStatus.FAILED)
      }
    }

    queue.shift()
  }, timeout)
}