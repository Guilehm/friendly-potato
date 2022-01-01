package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"goapi/models"
	"math/rand"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const borderOffset = 10

func RPGHandler(hub *models.Hub, w http.ResponseWriter, r *http.Request) {
	// TODO: do not allow all origins
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Error during connection upgrade:", err)
		return
	}
	defer conn.Close()

	for {
		message := models.WSMessage{}
		err = conn.ReadJSON(&message)
		if err != nil {
			if errors.Is(err.(*websocket.CloseError), err) {
				fmt.Println("Connection closed")
				return
			} else {
				fmt.Println("Could not read message:", err)
				continue
			}
		}

		switch message.MessageType {
		case models.GameJoin:
			data := models.GameJoinMessage{}
			err := json.Unmarshal(message.Data, &data)
			if err != nil {
				fmt.Println("Error during unmarshall:", err)
				break
			}

			rand.Seed(time.Now().Unix())
			ctChoices := []models.CharacterType{
				models.Human,
				models.Orc,
				models.Skeleton,
				models.Archer,
			}

			posMinX := 0 + borderOffset
			posMinY := 50 + borderOffset

			posMaxX := 900 - borderOffset
			posMaxY := 700 - borderOffset

			rand.Seed(time.Now().UnixNano())
			posX := rand.Intn(posMaxX-posMinX+1) + posMinX
			posY := rand.Intn(posMaxY-posMinY+1) + posMinY

			np := &models.Player{
				Type:      ctChoices[rand.Int()%len(ctChoices)],
				Username:  data.Username,
				PositionX: posX,
				PositionY: posY,
			}
			client := &models.Client{
				Hub:    hub,
				Conn:   conn,
				Send:   make(chan []byte, 256),
				Player: np,
			}
			hub.Register <- client
			hub.Broadcast <- true

		}
	}
}
