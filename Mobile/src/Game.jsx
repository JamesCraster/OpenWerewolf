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
  constructor(props) {
    super(props);
    this.state = {
      role: { roleName: "loading...", roleColor: "black" },
      players: [],
      value: "",
    };
    this.props.socket.on("allPlayers", usernames => {
      console.log(usernames);
      this.setState({ players: usernames });
    });
    this.props.socket.on("role", (roleName, color) => {
      this.setState({ role: { roleName: roleName, color: color } });
    });
  }
  handleChange = (e, { value }) => this.setState({ value: value });
  render() {
    let radios = [];

    for (let i = 0; i < this.state.players.length; i++) {
      radios.push(
        <Form.Field key={i}>
          <Radio
            toggle
            label={this.state.players[i]}
            name="radioGroup"
            value={this.state.players[i]}
            checked={this.state.value === this.state.players[i]}
            onChange={this.handleChange}
          />
        </Form.Field>,
      );
    }

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
              <h4>
                You are a:{" "}
                <span style={{ color: this.state.role.color }}>
                  {this.state.role.roleName}
                </span>
              </h4>

              <h4>Target:</h4>
              <Form
                id="action"
                onSubmit={() => {
                  console.log(this.state.value);
                  this.props.socket.emit(
                    "message",
                    `/vote ${this.state.value}`,
                  );
                  this.setState({ value: "" });
                }}
              >
                {radios}
              </Form>
            </Card.Content>
            {
              <Card.Content extra>
                <Button type="submit" form="action" fluid={true} color="green">
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
