import "dotenv/config";
import Groq from "groq-sdk";

let client;

function getClient() {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY || (process.env.NODE_ENV === "test" ? "mock-key" : undefined);
    client = new Groq({ apiKey });
  }
  return client;
}

const groq = new Proxy(
  {},
  {
    get(_target, prop) {
      return getClient()[prop];
    },
  }
);

export default groq;