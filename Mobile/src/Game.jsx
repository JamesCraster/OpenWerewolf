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
      let players = usernames.map(elem => {
        return { username: elem, dead: false };
      });
      this.setState({ players: players });
    });
    this.props.socket.on("markAsDead", username => {
      let target = this.state.players.findIndex(
        elem => elem.username == username || elem.username == " " + username,
      );
      let temporaryArray = this.state.players.slice();
      temporaryArray[target].dead = true;
      this.setState({ players: temporaryArray });
    });
    this.props.socket.on("role", (roleName, color) => {
      this.setState({ role: { roleName: roleName, color: color } });
    });
  }
  handleChange = (e, { value }) => this.setState({ value: value });
  render() {
    let radios = [];
    for (let i = 0; i < this.state.players.length; i++) {
      let style = {};
      if (this.state.players[i].dead) {
        style = { textDecoration: "line-through", color: "red" };
        radios.push(
          <Form.Field key={this.state.players[i].username}>
            <Radio
              disabled
              toggle
              label={this.state.players[i].username}
              name="radioGroup"
              value={this.state.players[i].username}
              checked={this.state.value === this.state.players[i].username}
              onChange={this.handleChange}
              style={style}
            />
          </Form.Field>,
        );
      } else {
        radios.push(
          <Form.Field key={this.state.players[i].username}>
            <Radio
              toggle
              label={this.state.players[i].username}
              name="radioGroup"
              value={this.state.players[i].username}
              checked={this.state.value === this.state.players[i].username}
              onChange={this.handleChange}
              style={style}
            />
          </Form.Field>,
        );
      }
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

                <Form.Field>
                  <Button
                    negative
                    onClick={this.props.socket.emit("message", "/guilty")}
                  >
                    Guilty
                  </Button>
                  <Button blue>Abstain</Button>
                  <Button
                    positive
                    onClick={this.props.socket.emit("message", "/innocent")}
                  >
                    Innocent
                  </Button>
                </Form.Field>
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
