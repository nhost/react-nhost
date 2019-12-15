import React, { Component } from 'react';
import { ApolloProvider } from 'react-apollo';
import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { setContext } from 'apollo-link-context';
import { WebSocketLink } from 'apollo-link-ws';
import { HttpLink } from 'apollo-link-http';
import { split } from 'apollo-link';
import { getMainDefinition } from 'apollo-utilities';

function NhostProvider() {

  const httpurl = `https://${props.config.address}`;
  const wsurl = `wss://${props.config.address}`;

  // create the web socket link
  const wsLink = new WebSocketLink({
    uri: wsurl,
    options: {
      reconnect: true,
      connectionParams: () => {

        const jwt_token = auth.getJWTToken();

        if (!jwt_token) {
          return {
            headers: {
              ...param_headers,
            },
          }
        }

        return {
          headers: {
            authorization: `Bearer ${jwt_token}`,
            ...param_headers,
          },
        };
      },
    },
  });

  let httpLink = new HttpLink({
    uri: httpurl,
  });

  const authLink = setContext((a, { headers }) => {
    const jwt_token = auth.getJWTToken();
    return {
      headers: {
        ...headers,
        authorization: jwt_token ? `Bearer ${jwt_token}` : '',
        ...param_headers,
      },
    };
  });

  const link = split(
    // split based on operation type
    ({ query }) => {
      const { kind, operation } = getMainDefinition(query);
      return kind === 'OperationDefinition' && operation === 'subscription';
    },
    wsLink,
    httpLink
  );

  const client = new ApolloClient({
    link: authLink.concat(link),
    cache: new InMemoryCache(),
  });

  return (
    <ApolloProvider client={client}>
      {props.render(props)}
    </ApolloProvider>;
  );
}

export default NhostProvider;
