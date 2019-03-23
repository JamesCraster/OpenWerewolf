"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
class RoleSelection extends React.Component {
    constructor(props) {
        super(props);
        this.addButtons = (roles) => {
            let buttons = [];
            let key = this.state.key;
            for (let role of roles) {
                buttons.push(React.createElement("button", { className: "ui blue button", key: key++, onClick: this.handleRoleClick, style: { backgroundColor: role.color } }, role.roleName));
            }
            this.setState({ roles: buttons });
            this.setState({ key: key });
        };
        this.handleRoleClick = (e) => {
            let newRoleNames = this.state.roleNames.slice();
            let target = e.target;
            newRoleNames.push(target.textContent);
            this.setState({
                roleNames: newRoleNames,
            });
            console.log(newRoleNames);
        };
        this.state = { roles: [], key: 0, roleNames: [], display: "none" };
        /*this.props.user.socket.on(
          "makeHost",
          (roles: Array<{ roleName: string; color: string }>) => {
            this.addButtons(roles);
            this.setState({ display: "inherit" });
          },
        );*/
    }
    render() {
        return (React.createElement("div", { className: "header", style: {
                maxHeight: "60%",
                overflowY: "scroll",
                display: this.state.display,
                paddingBottom: "5px",
                marginTop: "100px",
                paddingLeft: "5px",
                left: "35%",
                backgroundColor: "#212121",
                color: "#cecece",
                fontFamily: "IBM Sans Plex', sans-serif",
                fontSize: "20px",
                width: "30%",
                position: "absolute",
                border: "2px solid black",
            } },
            React.createElement("p", null, "You are the host. Role selection:"),
            React.createElement("br", null),
            React.createElement("div", { className: "ui form" },
                React.createElement("h4", null, "Default"),
                React.createElement("p", null, "Pressing the defalt button will start with the default rolelist (if there are enough players):"),
                React.createElement("button", { className: "ui blue button", onClick: () => {
                        this.props.user.socket.emit("useDefaultRoleList");
                    }, disabled: true }, "Default"),
                React.createElement("br", null),
                " ",
                React.createElement("h4", null, "Custom"),
                React.createElement("p", null, "Select as many roles as you have players, then hit submit to start:"),
                React.createElement("div", { id: "allRolesForGameType" }, this.state.roles),
                React.createElement("br", null),
                React.createElement("button", { className: "ui blue button", onClick: () => {
                        this.props.user.socket.emit("supplyRoleList", this.state.roleNames);
                    }, disabled: true }, "Submit"))));
    }
}
exports.default = RoleSelection;
//# sourceMappingURL=roleSelection.js.map