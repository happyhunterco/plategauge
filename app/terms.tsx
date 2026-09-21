import { ScrollView, StyleSheet, Text } from 'react-native';
import { Screen } from '../src/components/UI';
import { color, font, space } from '../src/theme';

export default function Terms() {
  return (
    <Screen title="Terms of Service">
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.updated}>Last updated: September 2026</Text>

        <Text style={styles.h}>Acceptance</Text>
        <Text style={styles.p}>By using Vahla, you agree to these terms. If you do not agree, do not use the app.</Text>

        <Text style={styles.h}>What Vahla is</Text>
        <Text style={styles.p}>
          Vahla is a calorie and nutrition tracking tool. It provides estimates based on publicly available nutrition data and AI analysis. It is not
          medical advice. Always consult a healthcare professional before making significant changes to your diet.
        </Text>

        <Text style={styles.h}>Accuracy</Text>
        <Text style={styles.p}>
          Nutrition data comes from USDA FoodData Central, Open Food Facts, HealthyFastFood.org, and AI estimates. While we strive for accuracy, all values are
          estimates and may not exactly match the food you eat. Restaurant items may vary by location and preparation.
        </Text>

        <Text style={styles.h}>Your account</Text>
        <Text style={styles.p}>
          You are responsible for keeping your login credentials secure. You can delete your account at any time, which permanently removes all your data.
        </Text>

        <Text style={styles.h}>Acceptable use</Text>
        <Text style={styles.p}>
          Do not use Vahla to harm others, reverse-engineer the service, or violate any laws. We reserve the right to suspend accounts that violate these
          terms.
        </Text>

        <Text style={styles.h}>Limitation of liability</Text>
        <Text style={styles.p}>
          Vahla is provided as-is. We are not liable for any health outcomes, data loss, or damages arising from your use of the app. Use the nutrition
          information at your own discretion.
        </Text>

        <Text style={styles.h}>Changes</Text>
        <Text style={styles.p}>We may update these terms. Continued use after changes means you accept the updated terms.</Text>

        <Text style={styles.h}>Contact</Text>
        <Text style={styles.p}>Questions? Email support@plategauge.app.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.l, gap: space.m, paddingBottom: 80 },
  updated: { fontSize: 13, color: color.faint },
  h: { fontFamily: font.displayBold, fontSize: 17, color: color.ink, marginTop: space.m },
  p: { fontSize: 15, lineHeight: 22, color: color.sub },
});
