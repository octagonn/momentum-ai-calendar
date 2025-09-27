import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface Props {
  children: React.ReactNode;
  testID?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown) {
    console.error("ErrorBoundary caught:", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID={this.props.testID ?? "error-boundary"}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.errorMessage ?? "An unexpected error occurred."}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} testID="error-boundary-retry">
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <>{this.props.children}</>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0f0f23",
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#ffffff",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#a1a1aa",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600" as const,
    fontSize: 14,
  },
});