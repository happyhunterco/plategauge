import { ScrollView, StyleSheet, Text } from 'react-native';
import { Screen } from '../src/components/UI';
import { color, font, space } from '../src/theme';

const Section = ({ title, children }: { title: string; children: string }) => (
  <>
    <Text style={styles.h}>{title}</Text>
    <Text style={styles.p}>{children}</Text>
  </>
);

export default function Terms() {
  return (
    <Screen title="Terms of Service">
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.updated}>Effective September 21, 2026</Text>
        <Section title="Agreement and eligibility">
          By creating an account or using Vahla, you agree to these terms and the Privacy Policy. You must be at least 18 years old and legally able to enter
          this agreement. If you do not agree, do not use Vahla.
        </Section>
        <Section title="Health and fitness disclaimer">
          Vahla is a general wellness, food logging, and fitness planning tool—not a medical device, healthcare provider, registered dietitian, or personal
          trainer. Calories, nutrients, exercise burn, targets, AI outputs, and workout plans are estimates and may be incomplete or wrong. Vahla does not
          diagnose, treat, or prevent any condition. Consult a qualified professional before changing diet or exercise, especially if you are pregnant, take
          medication, have an injury, eating-disorder history, allergy, or other health condition. Stop exercise and seek appropriate care for pain, faintness,
          chest pain, breathing difficulty, or an emergency.
        </Section>
        <Section title="Food and allergy safety">
          Food data may come from manufacturers, restaurants, users, USDA FoodData Central, Open Food Facts, HealthyFastFood.org, Nutritionix, FatSecret, and
          AI estimates. Recipes, formulations, serving sizes, and preparation vary. Never rely on Vahla to identify allergens or determine whether a food is
          safe. Check packaging and ask the restaurant or manufacturer.
        </Section>
        <Section title="Exercise safety">
          You are responsible for choosing appropriate exercises, loads, equipment, supervision, and surroundings. Demonstrations and plans are educational
          and cannot account for every limitation. Use proper form, progress gradually, and substitute or skip movements that are unsafe for you.
        </Section>
        <Section title="Accounts and user content">
          Keep credentials secure and provide accurate information. You retain ownership of content you submit and give Vahla permission to host, process,
          transform, and transmit it only as needed to operate and improve the service. Do not submit content you lack the right to use. You may delete your
          account in Profile.
        </Section>
        <Section title="Subscriptions, renewal, and cancellation">
          Paid plans, if offered, renew automatically at the price and interval shown at purchase until canceled. Purchases made on the web are processed by
          Stripe and can be managed from Profile. Purchases made through Apple or Google are billed and managed by that store. Cancellation stops future
          renewal but ordinarily does not refund the current period except when required by law or the purchase platform. Deleting your Vahla account cancels
          an active Vahla web subscription; store subscriptions must also be managed through the applicable store.
        </Section>
        <Section title="Acceptable use">
          Do not misuse the service, access another person’s account, upload unlawful or harmful material, scrape or disrupt the service, evade limits,
          reverse-engineer protected portions, or use Vahla in violation of law. We may restrict or terminate access to protect users or the service.
        </Section>
        <Section title="Ownership and third-party material">
          Vahla’s software, brand, and original content are protected by applicable intellectual-property law. Third-party names and trademarks belong to
          their owners and do not imply endorsement. Open Food Facts database content is available under the Open Database License and product images may be
          separately licensed; USDA data is generally public domain. Other providers’ content remains subject to their terms.
        </Section>
        <Section title="Service changes and availability">
          Features and data sources may change, be interrupted, or be discontinued. We do not promise that Vahla will always be available, error-free, or
          compatible with every device. Keep your own copy of information you cannot afford to lose.
        </Section>
        <Section title="Disclaimers and responsibility">
          To the maximum extent permitted by law, Vahla is provided “as is” and “as available,” without warranties of accuracy, fitness, non-infringement, or
          uninterrupted operation. You are responsible for decisions and activities based on the service. Nothing in these terms excludes rights or liability
          that cannot legally be excluded. Specific liability limits and governing-law terms may depend on the legal entity and country shown in the relevant
          app-store listing or checkout.
        </Section>
        <Section title="Changes and contact">
          We may update these terms and will update the effective date or provide additional notice when required. Continued use after an effective update
          means you accept the revised terms. Questions can be sent to support@vahla.co.
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
