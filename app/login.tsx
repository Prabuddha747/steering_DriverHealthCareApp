import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from "@/src/config/constants";
import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { signInOrCreateAdmin } from "@/src/services/firebaseService";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    const trimmed = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmed || !trimmedPassword) {
      setError("Please enter username/email and password");
      return;
    }

    const isAdminDefault =
      (trimmed === "admin123" && trimmedPassword === DEFAULT_ADMIN_PASSWORD) ||
      (trimmed === DEFAULT_ADMIN_EMAIL &&
        trimmedPassword === DEFAULT_ADMIN_PASSWORD);
    let signInEmail = trimmed === "admin123" ? DEFAULT_ADMIN_EMAIL : trimmed;
    if (!isAdminDefault && !signInEmail.includes("@")) {
      signInEmail = `${signInEmail}@gmail.com`;
    }

    setLoading(true);
    try {
      if (isAdminDefault) {
        await signInOrCreateAdmin(signInEmail, trimmedPassword);
      } else {
        await (signIn as (email: string, password: string) => Promise<void>)(
          signInEmail,
          trimmedPassword,
        );
      }
      router.replace("/");
    } catch (e: any) {
      const code = e?.code || "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setError(
          "Wrong username/email or password.Admin: admin123.  Drivers: username + @gmail.com",
        );
      } else if (code === "auth/operation-not-allowed") {
        setError(
          "Email sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.",
        );
      } else {
        setError(e?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        container: {
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          backgroundColor: colors.background,
        },
        form: { width: "100%" },
        logo: { width: 100, height: 100, marginBottom: 16, alignSelf: "center", borderRadius: 50, overflow: "hidden" },
        title: {
          fontSize: 24,
          fontWeight: "700",
          marginBottom: 8,
          color: colors.text,
        },
        hint: {
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: 20,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          marginBottom: 16,
          backgroundColor: colors.surface,
          color: colors.text,
        },
        error: { color: colors.error, marginBottom: 12 },
        btn: {
          backgroundColor: colors.primary,
          paddingVertical: 14,
          borderRadius: 4,
          alignItems: "center",
        },
        btnDisabled: { opacity: 0.7 },
        btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
        back: { marginTop: 16, alignItems: "center" },
        backText: { color: colors.textSecondary },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.form}>
          <Image source={require("@/assets/images/app_logo1.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Login</Text>
          <Text style={styles.hint}>
            Admin or Drivers: username (adds @gmail.com automatically)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Username or email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Login</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
