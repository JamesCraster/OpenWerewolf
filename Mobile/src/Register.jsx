import React, { Component } from "react";
import { Button, Dimmer, Card, Header, Input, Form } from "semantic-ui-react";

export class Register extends Component {
  constructor(props) {
    super(props);
    //if registering was successful, move to the next card
    this.props.socket.on("registered", () => {
      this.props.nextCard();
    });
  }
  render() {
    return (
      <div className="Register">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <Card
            raised={true}
            style={{
              height: "80%",
              minHeight: "200px",
              width: "80%",
              minWidth: "300px",
              overflow: "auto",
            }}
          >
            <Dimmer />
            <Card.Content textAlign="left">
              <Header dividing={true}>OpenWerewolf - Local</Header>
              <Form>
                <p>
                  <b>To host a game:</b> go to{" "}
                  <a href="https://www.openwerewolf.com">
                    www.openwerewolf.com
                  </a>{" "}
                  on a laptop/desktop and create a local game. Then this host
                  computer will display an overview of the game (who is playing,
                  who is alive, what roles are etc.) The experience is best with
                  a projector/smart board.{" "}
                </p>
                <h4>Join a game:</h4>
                <Form.Field>
                  <label>N.B: Please use your real name!</label>
                  <Input
                    fluid={true}
                    icon="user"
                    iconPosition="left"
                    placeholder="Enter your real name..."
                    maxLength="10"
                  />
                </Form.Field>
                <Form.Field>
                  <Input
                    fluid={true}
                    icon="key"
                    iconPosition="left"
                    placeholder="Enter code..."
                    maxLength="6"
                  />
                </Form.Field>
                <Form.Field>
                  <Button
                    type="submit"
                    fluid={true}
                    color="green"
                    //join the player to a game if one exists
                    onClick={() => {
                      console.log("sent");
                      //register player and join game
                      this.props.socket.emit("localGameClick", "name", "1");
                    }}
                  >
                    JOIN GAME
                  </Button>
                </Form.Field>
              </Form>
            </Card.Content>
            {/*
              <Card.Content extra>
                <Button fluid={true} color="green">
                  JOIN GAME
                </Button>
              </Card.Content>
            */}
          </Card>
        </div>
      </div>
    );
  }
}

export default Register;
