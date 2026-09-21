import { ScrollView, StyleSheet, Text } from 'react-native';
import { Screen } from '../src/components/UI';
import { color, font, space } from '../src/theme';

const Section = ({ title, children }: { title: string; children: string }) => (
  <>
    <Text style={styles.h}>{title}</Text>
    <Text style={styles.p}>{children}</Text>
  </>
);

export default function Privacy() {
  return (
    <Screen title="Privacy Policy">
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.updated}>Effective September 21, 2026</Text>
        <Text style={styles.p}>This policy explains how Vahla collects, uses, shares, and retains information when you use our app and website.</Text>
        <Section title="Information you provide">
          We process account details such as your email and authentication provider; profile details such as name, username, age, sex used for calorie math,
          height, weight, goals, activity level, dietary preferences, allergies, favorite restaurants, and optional profile photo; and content you log, including
          foods, water, weight, activity, workouts, sets, repetitions, and plan progress. Please do not enter information you do not want processed.
        </Section>
        <Section title="Photos, labels, and AI">
          If you enable AI food analysis and submit a photo, label, food description, or pantry list, Vahla sends that input to Anthropic to generate an
          estimate. Vahla does not intentionally save submitted scan photos in its database, but service providers may process and retain inputs under their
          commercial terms, security practices, and legal obligations. AI results can be wrong; verify allergens, ingredients, and nutrition before relying
          on them.
        </Section>
        <Section title="How we use information">
          We use information to authenticate you, sync your account, calculate estimates and goals, provide food and workout features, process support and
          billing, secure and troubleshoot the service, prevent abuse, and comply with law. We do not sell personal information or use health and fitness
          information for targeted advertising.
        </Section>
        <Section title="Service providers and data sources">
          We use Supabase for authentication and database hosting, Netlify for app hosting and server functions, Anthropic for optional AI analysis, and
          Stripe for web subscription billing. Food searches may use USDA FoodData Central, Open Food Facts, HealthyFastFood.org, Nutritionix, and FatSecret,
          depending on configuration. Apple and Google process sign-in and app-distribution information under their own policies. These providers may process
          information in countries other than yours.
        </Section>
        <Section title="Payments">
          Vahla does not receive complete card numbers. Stripe processes web payments. Apple or Google processes purchases made through their stores. We keep
          subscription status, plan, and related transaction identifiers needed to provide access and support billing.
        </Section>
        <Section title="Device permissions and health data">
          Camera and photo access is used only when you choose scanning or a profile photo. Notifications are used only when you enable reminders. A future
          native health connection may, with your permission, read steps, active energy, or workouts. The app will identify requested data and purpose before
          access; health data will not be used for advertising or sold. You can revoke device permissions in system settings.
        </Section>
        <Section title="Storage, security, and retention">
          Account data is stored with Supabase and app data may also be cached on your device. Authentication sessions use platform-protected storage on iOS
          and Android. We use reasonable safeguards, but no system is perfectly secure. We retain account data while your account is active and as reasonably
          needed for security, legal, tax, dispute, and backup purposes. Provider logs and backups may persist for limited periods after deletion.
        </Section>
        <Section title="Your choices and rights">
          You can edit many profile and goal fields in the app, disable AI analysis and notifications, sign out, or delete your account in Profile. Account
          deletion removes active account data and cancels an active Vahla web subscription; deletion cannot be undone. Depending on where you live, you may
          also request access, correction, deletion, portability, or restriction by contacting us. We may need to verify your identity.
        </Section>
        <Section title="Age requirement">
          Vahla is currently intended only for people age 18 or older. We do not knowingly collect personal information from children. Contact us if you
          believe a child has provided information so we can investigate and delete it.
        </Section>
        <Section title="Changes and contact">
          We may update this policy as Vahla changes. We will update the effective date and provide additional notice when required. For privacy questions or
          rights requests, email privacy@vahla.co.
        </Section>
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
