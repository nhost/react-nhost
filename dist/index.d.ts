interface useAuthProps {
  signedIn: boolean | null;
}

export function NhostAuthProvider(auth: any): JSX.Element;
export function NhostApolloProvider(
  auth: any,
  gqlEndpoint: string,
  headers?: {
    [key: string]: any;
  }
): JSX.Element;

export function useAuth(): useAuthProps;
