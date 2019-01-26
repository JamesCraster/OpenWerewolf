import React, { Component } from "react";
import { Button, Dimmer, Card, Header, Input, Form } from "semantic-ui-react";

export class Waiting extends Component {
  render() {
    return (
      <div className="Waiting">
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
                  You should see your name on the board! The game will begin
                  when enough players join.
                </p>
              </Form>
            </Card.Content>
            {
              <Card.Content extra>
                <Button fluid={true} color="red">
                  LEAVE GAME
                </Button>
              </Card.Content>
            }
          </Card>
        </div>
      </div>
    );
  }
}

export default Waiting;
