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

const client = generateApolloClient(
  null,
  `https://hasura-zgp96xwz.nhost.app/v1/graphql`
);

export function NhostApolloProvider(props) {
  // const [client] = useState(() =>
  //   generateApolloClient(props.auth, props.gql_endpoint)
  // );
  return <ApolloProvider client={client}>{props.children}</ApolloProvider>;
}

export const AuthContext = createContext();

export function NhostAuthProvider(props) {
  const [signedIn, setSignedIn] = useState(props.auth.isAuthenticated());

  useEffect(() => {
    // beacause of potential race condition I want to set signedIn before I
    // create an onAuthStateChanged.
    setSignedIn(props.auth.isAuthenticated());

    // setting onAuthStateChanged to detect login/logout
    props.auth.onAuthStateChanged((data) => {
      setSignedIn(data);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ signedIn }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

export function ProtectRoute(Component) {
  return () => {
    const { signedIn } = useAuth();

    // use redirects instead
    // const router = useRouter();
    // useEffect(() => {
    //   if (signedIn === false) Router.push("/login");
    // }, [signedIn]);

    // wait to see if the user is logged in or not.
    if (signedIn === null) {
      return <div>Checking auth...</div>;
    }

    if (!signedIn) {
      // we could either show a <Login /> (as a second parameter to `ProtectRoute`) or
      // redirect the user using Router.redirect(`/login`); (redirect url could also be
      // sent as a parameter to `ProtectRoute`)
      return <div>Login form or redirect....</div>;
    }

    // render ProtectedRoute as normal
    return <Component {...arguments} />;
  };
}

export function MyComponent() {
  return <div>My niiiice component</div>;
}
