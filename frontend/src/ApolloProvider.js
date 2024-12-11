import React from "react";
import {
    ApolloClient,
    InMemoryCache,
    ApolloProvider as Provider,
} from "@apollo/client";

const client = new ApolloClient({
    uri: "http://localhost:3000/graphql",
    cache: new InMemoryCache(),
});

export default function ApolloProvider({ children }) {
    return <Provider client={client}>{children}</Provider>;
}
