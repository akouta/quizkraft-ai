import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";

jest.mock(
  "react-router-dom",
  () => ({
    Navigate: ({ to }) => <div>{`Redirect:${to}`}</div>,
    useLocation: () => ({ pathname: "/app" }),
  }),
  { virtual: true }
);

jest.mock("./context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require("./context/AuthContext");
const PrivateRoute = require("./components/Auth/PrivateRoute").default;

function renderRoute(authValue) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);

  useAuth.mockReturnValue(authValue);

  act(() => {
    root.render(
      <PrivateRoute>
        <div>Workspace</div>
      </PrivateRoute>
    );
  });

  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

test("redirects unauthenticated users to login", () => {
  const view = renderRoute({
    currentUser: null,
    isVerified: false,
    loading: false,
  });

  expect(view.container.textContent).toContain("Redirect:/login");
  view.unmount();
});

test("renders workspace for verified users", () => {
  const view = renderRoute({
    currentUser: { uid: "user-1", emailVerified: true },
    isVerified: true,
    loading: false,
  });

  expect(view.container.textContent).toContain("Workspace");
  view.unmount();
});
