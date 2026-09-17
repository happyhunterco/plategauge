import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { showUndo } from '../src/components/Kit';
import { Button, Chip, Field, Screen, success } from '../src/components/UI';
import { healthServiceName } from '../src/services/health';
import { useStore } from '../src/store';
import { color, space } from '../src/theme';

const ACTIVITIES = ['Walk', 'Run', 'Strength training', 'Cycling', 'Sports', 'Other'];
// Rough MET values for a calorie suggestion the user can overwrite.
const MET: Record<string, number> = { Walk: 3.5, Run: 9.8, 'Strength training': 5, Cycling: 7.5, Sports: 7, Other: 5 };

export default function Quick() {
  const { kind } = useLocalSearchParams<{ kind: 'water' | 'weight' | 'activity' }>();
  const router = useRouter();
  const s = useStore();
  const metric = s.settings.units === 'metric';
  const [val, setVal] = useState('');
  const [type, setType] = useState('Walk');
  const [minutes, setMinutes] = useState('');
  const [cals, setCals] = useState('');
  const n = parseFloat(val) || 0;

  const suggested = () => {
    const kg = (s.profile?.weightLb ?? 170) * 0.4536;
    const m = parseFloat(minutes) || 0;
    return Math.round(((MET[type] * 3.5 * kg) / 200) * m);
  };

  if (kind === 'water') {
    return (
      <Screen top={false}>
        <Stack.Screen options={{ title: 'Log water' }} />
        <View style={styles.pad}>
          <Field label={`Amount (${metric ? 'ml' : 'oz'})`} value={val} onChangeText={setVal} inputMode="decimal" keyboardType="decimal-pad" autoFocus />
          <View style={styles.chips}>
            {(metric ? [250, 330, 500, 750] : [8, 12, 16, 24]).map((x) => (
              <Chip key={x} label={`${x} ${metric ? 'ml' : 'oz'}`} onPress={() => setVal(String(x))} />
            ))}
          </View>
          <Button
            label="Add water"
            disabled={n <= 0}
            onPress={() => {
              const w = s.addWater(metric ? n / 29.57 : n);
              success();
              router.back();
              showUndo('Water added', () => useStore.getState().removeWater(w.id));
            }}
          />
        </View>
      </Screen>
    );
  }

  if (kind === 'weight') {
    return (
      <Screen top={false}>
        <Stack.Screen options={{ title: 'Log weight' }} />
        <View style={styles.pad}>
          <Field
            label={`Weight (${metric ? 'kg' : 'lb'})`}
            value={val}
            onChangeText={setVal}
            inputMode="decimal"
            keyboardType="decimal-pad"
            autoFocus
            placeholder={s.profile ? String(metric ? Math.round(s.profile.weightLb * 0.4536) : s.profile.weightLb) : ''}
          />
          <Text style={styles.fine}>Saved for the day you’re viewing. One weigh-in per day; logging again replaces it.</Text>
          <Button
            label="Save weight"
            disabled={n <= 0}
            onPress={() => {
              s.logWeight(Math.round((metric ? n / 0.4536 : n) * 10) / 10);
              success();
              router.back();
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen top={false}>
      <Stack.Screen options={{ title: 'Add activity' }} />
      <View style={styles.pad}>
        <View style={styles.chips}>
          {ACTIVITIES.map((a) => (
            <Chip key={a} label={a} on={type === a} onPress={() => setType(a)} />
          ))}
        </View>
        <View style={styles.row}>
          <Field label="Minutes" value={minutes} onChangeText={setMinutes} inputMode="numeric" keyboardType="number-pad" style={{ flex: 1 }} />
          <Field
            label="Calories burned"
            value={cals}
            onChangeText={setCals}
            inputMode="numeric"
            keyboardType="number-pad"
            placeholder={minutes ? String(suggested()) : ''}
            style={{ flex: 1 }}
          />
        </View>
        <Text style={styles.fine}>
          Leave calories blank to use an estimate from your weight and the activity. Whether activity adds to your food budget is set in Profile.
        </Text>
        <Button
          label="Save activity"
          disabled={!(parseFloat(minutes) > 0)}
          onPress={() => {
            s.addActivity({
              date: s.day,
              type,
              minutes: Math.round(parseFloat(minutes)),
              calories: parseFloat(cals) > 0 ? Math.round(parseFloat(cals)) : suggested(),
              source: 'manual',
            });
            success();
            router.back();
          }}
        />
        {healthServiceName ? (
          <Text style={styles.fine}>Workouts from {healthServiceName} can be imported automatically once it’s connected in Profile.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.m, paddingTop: space.l },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  row: { flexDirection: 'row', gap: space.m },
  fine: { fontSize: 13, color: color.sub, lineHeight: 18 },
});
