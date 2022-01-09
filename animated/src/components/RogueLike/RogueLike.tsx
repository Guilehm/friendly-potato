import { MutableRefObject, useRef, useState } from "react"
import { ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP, INTERACTION_COOLDOWN } from "../../constants"
import { Player, Positions, Sprite, Warrior } from "../../types/rogue-types"
import { WSMessage } from "../../types/ws-types"
import * as S from "./RogueLike.styles"


const RogueLike = (): JSX.Element => {

  const [ws, setWs] = useState<WebSocket | null>(null)
  const canvasRef = useRef() as MutableRefObject<HTMLCanvasElement>

  let PLAYERS_DATA: Array<Player> = []
  let LAST_INTERACTION = Date.now()

  const connect = () => {
    const location = process.env.REACT_APP_ROGUE_WS_LOCATION || "ws://localhost:8080/ws/rogue/"
    const webSocket = new WebSocket(location)
    setWs(webSocket)

    webSocket.onopen = () => {
      webSocket.send(JSON.stringify({
        type: "user-joins",
        data: { "sprite": Warrior },
      }))
    }

    webSocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "broadcast") {
        PLAYERS_DATA = data.players
      }
    }
    animate()
  }

  const drawCooldown = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const clock = new Image()
    clock.src = `${window.location.origin}/img/assets/rogue/clock.png`
    ctx.drawImage(clock, canvas.width - 7, canvas.height - 7, 6, 6)
  }

  const drawBackground = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const background = new Image()
    background.src = `${window.location.origin}/img/assets/rogue/sprites/background.png`
    ctx.drawImage(background, dx, dy, dw, dh)
  }

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    player: Player,
    sprite: Positions,
  ) => {
    const image = new Image()
    image.src = `${window.location.origin}/img/assets/rogue/sprites/${player.sprite.tileSet}.png`
    ctx.drawImage(
      image,
      sprite.spriteX,
      sprite.spriteY,
      sprite.spriteWidth,
      sprite.spriteHeight,
      player.moving ? player.movingPosition.positionX + sprite.xOffset || 0 : player.positionX + sprite.xOffset || 0,
      player.moving ? player.movingPosition.positionY + sprite.yOffset || 0 : player.positionY + sprite.yOffset || 0,
      sprite.spriteWidth,
      sprite.spriteHeight,
    )

  }

  const animate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    requestAnimationFrame(animate)

    const dx = 0
    const dy = 0
    drawBackground(canvas, ctx, dx, dy, canvas.width, canvas.height)

    const now = Date.now()
    PLAYERS_DATA.forEach((player) => {
      let sprite
      if (player.lastAnimationTime === undefined) player.lastAnimationTime = now
      if (player.animation) {
        sprite = player.sprite.animation
      } else {
        sprite = player.sprite
      }
      if (now > (player.lastAnimationTime + player.sprite.animationPeriod)) {
        player.animation = !player.animation
        player.lastAnimationTime = now
      }

      if (
        (player.lastPosition.positionX !== player.positionX) ||
        (player.lastPosition.positionY !== player.positionY)
      ) {

        if (!player.movingPosition) player.movingPosition = {
          positionX: player.lastPosition.positionX,
          positionY: player.lastPosition.positionY,
        }

        if (
          (player.movingPosition.positionX !== player.positionX) ||
          (player.movingPosition.positionY !== player.positionY)
        ) {
          if (!player.lastMovingTime) player.lastMovingTime = now
          player.moving = true
          if (now > (player.lastMovingTime + (player.sprite.animationPeriod / 40))) {
            player.lastMovingTime = now

            if (player.movingPosition.positionX < player.positionX) player.movingPosition.positionX += 1
            if (player.movingPosition.positionX > player.positionX) player.movingPosition.positionX -= 1
            if (player.movingPosition.positionY < player.positionY) player.movingPosition.positionY += 1
            if (player.movingPosition.positionY > player.positionY) player.movingPosition.positionY -= 1
          }
        } else {
          player.moving = false
        }
      }
      player.moving && drawCooldown(canvas, ctx)
      drawPlayer(ctx, player, sprite)
    })

  }

  const handleKeyDown = (key: string) => {
    const now = Date.now()
    if (!(now > LAST_INTERACTION + INTERACTION_COOLDOWN)) return
    LAST_INTERACTION = now
    const validKeys = [
      ARROW_LEFT,
      ARROW_UP,
      ARROW_RIGHT,
      ARROW_DOWN,
    ]

    if (!validKeys.includes(key)) return
    const msg: WSMessage = {
      type: "key-down",
      data: key,
    }
    ws && ws.send(JSON.stringify(msg))
  }


  return (
    <S.Container>
      <button onClick={connect}>start</button>
      <S.Canvas
        tabIndex={0}
        width={8 * 15}
        height={8 * 10}
        ref={canvasRef}
        onKeyDown={(e) => handleKeyDown(e.key)}>
      </S.Canvas>
    </S.Container >
  )
}


export default RogueLike
