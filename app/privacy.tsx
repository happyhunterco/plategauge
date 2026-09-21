import { ScrollView, StyleSheet, Text } from 'react-native';
import { Screen } from '../src/components/UI';
import { color, font, space } from '../src/theme';

export default function Privacy() {
  return (
    <Screen title="Privacy Policy">
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.updated}>Last updated: September 2026</Text>

        <Text style={styles.h}>What we collect</Text>
        <Text style={styles.p}>
          Vahla stores the food you log, your nutrition goals, and your profile information (name, username, profile photo). If you create an account, your
          email address is stored for authentication. All data is stored securely on Supabase (our database provider) and associated with your account.
        </Text>

        <Text style={styles.h}>Photo and label scanning</Text>
        <Text style={styles.p}>
          When you scan a meal or a nutrition label, the photo is sent to Anthropic (our AI provider) for analysis. Photos are processed in real time and are
          not stored by Vahla or Anthropic after analysis is complete. No photos are used for training.
        </Text>

        <Text style={styles.h}>What we do not collect</Text>
        <Text style={styles.p}>
          We do not collect your location, contacts, browsing history, or any data beyond what you explicitly enter into the app. We do not sell or share your
          data with advertisers. We do not use tracking cookies.
        </Text>

        <Text style={styles.h}>Third-party services</Text>
        <Text style={styles.p}>
          Vahla uses Supabase for authentication and data storage, Anthropic for AI-powered food analysis, and open nutrition databases (USDA FoodData
          Central, Open Food Facts, HealthyFastFood.org) for food lookups. Each service has its own privacy policy.
        </Text>

        <Text style={styles.h}>Apple Health</Text>
        <Text style={styles.p}>
          If you choose to connect Apple Health (iOS app only), Vahla reads your step count, active energy, and workout data to adjust your daily calorie
          budget. This data stays on your device and is never sent to our servers. You can disconnect Apple Health at any time from Settings.
        </Text>

        <Text style={styles.h}>Data deletion</Text>
        <Text style={styles.p}>
          You can delete your account and all associated data at any time from Profile → Delete Account. This permanently removes your profile, food log, and
          goals from our servers. This action cannot be undone.
        </Text>

        <Text style={styles.h}>Children</Text>
        <Text style={styles.p}>
          Vahla is not intended for children under 13. We do not knowingly collect data from children under 13. If you believe a child under 13 has created
          an account, please contact us and we will delete it.
        </Text>

        <Text style={styles.h}>Contact</Text>
        <Text style={styles.p}>For privacy questions, email privacy@plategauge.app.</Text>
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
