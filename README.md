# React Nhost

> Experimental. Code and documentation might not be up-to-date.

Make it easy to use Nhost with React.

## Protected Route

### React Router

`PrivateRoute.jsx`

```jsx
import React from "react";
import { Route, Redirect } from "react-router-dom";
import { auth } from "path_to_nhost_auth";

function PrivateRoute({ children, ...rest }) {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        auth.isAuthenticated() ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: location },
            }}
          />
        )
      }
    />
  );
}
```

#### Usage

```jsx
import PrivateRoute from "[..]path_to/PrivateRoute.jsx";

<Router>
  <Switch>
    /* Unprotected routes */
    <Route exact path="/register">
      <Register />
    </Route>
    <Route exact path="/login">
      <Login />
    </Route>
    /* Protected routes */
    <PrivateRoute>
      <Route exact path="/dashboard">
        <Dashboard />
      </Route>
      <Route exact path="/settings">
        <Settings />
      </Route>
    </PrivateRoute>
  </Switch>
</Router>;
```

---

### NextJS

`privateRoute.jsx`

```jsx
import { useAuth } from "react-nhost";

export function privateRoute(Component) {
  return () => {
    const { signedIn } = useAuth();

    // wait to see if the user is logged in or not.
    if (signedIn === null) {
      return <div>Checking auth...</div>;
    }

    if (!signedIn) {
      return <div>Login form or redirect to `/login`.<div>;
    }

    return (<Component {...arguments} />);
  };
}
```

#### Usage

```jsx
import React from "react";
import { protectRoute } from "[..]path_to/protectRoute.jsx";

function Dashboard(props) {
  return <div>My dashboard</div>;
}

export default privateRoute(Dashboard);
```
