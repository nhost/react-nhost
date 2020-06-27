import React, { useState, useEffect, createContext, useContext } from "react";
// import { ApolloProvider } from "react-apollo";
import { InMemoryCache } from "apollo-cache-inmemory";
// import ApolloClient from "apollo-client";
import { ApolloProvider, ApolloClient } from "@apollo/client";
import { setContext } from "@apollo/link-context";
import { WebSocketLink } from "apollo-link-ws";
import { createHttpLink } from "apollo-link-http";
import { from, split } from "apollo-link";
import { getMainDefinition } from "apollo-utilities";

export function generateApolloClient(auth, gql_endpoint) {
  const uri = gql_endpoint;

  const wsUri = uri.startsWith("https")
    ? uri.replace(/^https/, "wss")
    : uri.replace(/^http/, "ws");

  // some tweaking here to get Apollo to work nice with NextJS.
  // I am a bit unsure if all this is needed?
  const wsLink = process.browser
    ? new WebSocketLink({
        uri: wsUri,
        options: {
          reconnect: true,
          connectionParams: () => {
            const authorization_header = auth.getJWTToken()
              ? {
                  authorization: `Bearer ${auth.getJWTToken()}`,
                }
              : null;

            return {
              headers: {
                ...authorization_header,
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
    const authorization_header = auth.getJWTToken()
      ? {
          authorization: `Bearer ${auth.getJWTToken()}`,
        }
      : null;

    return {
      headers: {
        ...headers,
        ...authorization_header,
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

export function NhostApolloProvider(props) {
  // if (typeof window !== "undefined") {

  // config from _app.jsx containing `graphql_endpoint` and nhost's `auth` object
  const { auth, gql_endpoint } = props;

  // is the function generateApolloClient only executed once?
  const [client] = useState(generateApolloClient(auth, gql_endpoint));

  return <ApolloProvider client={client}>{props.children}</ApolloProvider>;
  // }

  // return (
  //   <div>
  //     <div>ssr</div>
  //     {props.children}
  //   </div>
  // );
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
