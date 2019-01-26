import React, { Component } from "react";
import {
  Button,
  Dimmer,
  Card,
  Header,
  Input,
  Form,
  Radio,
} from "semantic-ui-react";

export class Game extends Component {
  state = {};
  handleChange = (e, { value }) => this.setState({ value });
  render() {
    return (
      <div className="Game">
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
              <h4>You are a: </h4>

              <h4>Target:</h4>
              <Form>
                <Form.Field>
                  <Radio
                    toggle
                    label="Choose this"
                    name="radioGroup"
                    value="this"
                    checked={this.state.value === "this"}
                    onChange={this.handleChange}
                  />
                </Form.Field>
                <Form.Field>
                  <Radio
                    toggle
                    label="Or that"
                    name="radioGroup"
                    value="that"
                    checked={this.state.value === "that"}
                    onChange={this.handleChange}
                  />
                </Form.Field>
              </Form>
            </Card.Content>
            {
              <Card.Content extra>
                <Button fluid={true} color="green">
                  PERFORM ACTION
                </Button>
              </Card.Content>
            }
          </Card>
        </div>
      </div>
    );
  }
}

export default Game;
