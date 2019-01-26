import React, { Component } from "react";
import { Button, Dimmer, Card, Header, Input, Form } from "semantic-ui-react";
import "./App.css";
import { Waiting } from "./Waiting";
import { Register } from "./Register";
import { Game } from "./Game";
import io from "socket.io-client";

class App extends Component {
  constructor(props) {
    super(props);
    //set which page we are on
    this.state = { page: "Register" };
    //connect up to OpenWerewolf main server
    this.socket = io("localhost:8081");
    //if the player is already connected, bounce them to the correct page
  }
  render() {
    if (this.state.page == "Register") {
      return (
        <div className="App">
          <Register nextCard={this.nextCard} socket={this.socket} />
        </div>
      );
    } else if (this.state.page == "Waiting") {
      return (
        <div className="App">
          <Waiting nextCard={this.nextCard} socket={this.socket} />
        </div>
      );
    } else {
      return (
        <div className="App">
          <Game socket={this.socket} />
        </div>
      );
    }
  }
  nextCard = () => {
    if (this.state.page == "Register") {
      this.setState({ page: "Waiting" });
    } else if (this.state.page == "Waiting") {
      this.setState({ page: "Game" });
    }
  };
}

export default App;
