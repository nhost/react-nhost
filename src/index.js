import React, { useState, useEffect, createContext, useContext } from "react";
// import { ApolloProvider } from "react-apollo";
import { InMemoryCache } from "apollo-cache-inmemory";
// import ApolloClient from "apollo-client";
import { ApolloClient } from "@apollo/client";
import { ApolloProvider } from "@apollo/react-hooks";
import { useQuery } from "@apollo/react-hooks";
import { setContext } from "@apollo/link-context";
import { WebSocketLink } from "apollo-link-ws";
import { createHttpLink } from "apollo-link-http";
import { from, split } from "apollo-link";
import { getMainDefinition } from "apollo-utilities";
import gql from "graphql-tag";

export function generateApolloClient(auth, gql_endpoint) {
  const getheaders = (auth) => {
    if (auth) {
      return {
        authorization: `Bearer ${auth.getJWTToken()}`,
      };
    }
  };

  const uri = gql_endpoint;

  const wsUri = uri.startsWith("https")
    ? uri.replace(/^https/, "wss")
    : uri.replace(/^http/, "ws");

  const wsLink = process.browser
    ? new WebSocketLink({
        uri: wsUri,
        options: {
          reconnect: true,
          connectionParams: (wut) => {
            return {
              headers: {
                ...getheaders(auth),
              },
            };
          },
        },
      })
    : null;

  const httplink = createHttpLink({
    uri,
  });

  const authLink = setContext((a, { headers }) => {
    return {
      headers: {
        ...headers,
        ...getheaders(auth),
      },
    };
  });

  // same here, we check if we are in the browser.
  // the problem is, how I could use this Apollo client in the server... ?
  const link = process.browser
    ? split(
        ({ query }) => {
          const { kind, operation } = getMainDefinition(query);
          return kind === "OperationDefinition" && operation === "subscription";
        },
        wsLink,
        authLink.concat(httplink)
      )
    : httplink;

  const client = new ApolloClient({
    ssr: false,
    link: from([link]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });

  return client;
}

// const client = generateApolloClient(
//   null,
//   `https://hasura-zgp96xwz.nhost.app/v1/graphql`
// );

// export function NhostApolloProvider(props) {
// const [client] = useState(() =>
//   generateApolloClient(props.auth, props.gql_endpoint)
// );
export class NhostApolloProvider extends React.Component {
  constructor(props) {
    super(props);
    const { auth, gql_endpoint } = this.props;
    this.client = generateApolloClient(auth, gql_endpoint);
  }

  render() {
    return (
      <ApolloProvider client={this.client}>
        {this.props.children}
      </ApolloProvider>
    );
  }
}

export const AuthContext = createContext({ signedIn: null });

export class NhostAuthProvider extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      signedIn: props.auth.isAuthenticated(),
    };

    auth.onAuthStateChanged((data) => {
      this.setState({ signedIn: data });
    });
  }

  render() {
    return (
      <AuthContext.Provider value={{ signedIn: this.state.signedIn }}>
        {this.props.children}
      </AuthContext.Provider>
    );
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
