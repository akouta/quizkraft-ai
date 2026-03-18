import { auth } from "../firebase/firebaseConfig";

const API_BASE_URL = process.env.REACT_APP_FUNCTION_URL || "";

async function getAuthHeaders(requireAuth) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Authentication required.");
    }

    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    requireAuth = true,
    headers: customHeaders,
    responseType = "json",
  } = options;
  const headers = {
    ...(await getAuthHeaders(requireAuth)),
    ...customHeaders,
  };

  if (body === undefined) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      message = errorBody.error || message;
    } catch (error) {
      // Keep the default message when the response is not JSON.
    }

    throw new Error(message);
  }

  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "text") {
    return response.text();
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
