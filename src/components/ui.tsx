import React, { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Country } from '../api/types';
import { useI18n } from '../i18n';
import { colors, radius, spacing, type } from '../theme';

// ---------- Écran ----------
export function Screen({
  children,
  scroll = true,
  safe = false,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  safe?: boolean;
  footer?: ReactNode;
}) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex]}>{children}</View>
  );
  const inner = (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
  return safe ? <SafeAreaView style={styles.root}>{inner}</SafeAreaView> : <View style={styles.root}>{inner}</View>;
}

// ---------- Boutons ----------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'warning';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.green} />
      ) : (
        <Text style={[styles.buttonText, buttonTextStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ---------- Champs ----------
/** Libellé d'un champ ; `required` ajoute l'astérisque des champs obligatoires. */
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

export function TextField({
  label,
  error,
  hint,
  style,
  required,
  ...rest
}: TextInputProps & { label: string; error?: string | null; hint?: string; required?: boolean }) {
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <TextInput
        style={[styles.input, !!error && styles.inputError, style]}
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.checkboxRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <View style={styles.flex}>{children}</View>
    </Pressable>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

// ---------- Contenu ----------
export function Card({
  children,
  onPress,
  accent,
}: {
  children: ReactNode;
  onPress?: () => void;
  accent?: string;
}) {
  const content = (
    <View style={styles.cardInner}>
      {accent ? <View style={[styles.cardAccent, { backgroundColor: accent }]} /> : null}
      <View style={[styles.flex, styles.cardBody]}>{children}</View>
    </View>
  );
  if (!onPress) return <View style={styles.card}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function Banner({ kind = 'error', text }: { kind?: 'error' | 'info'; text: string }) {
  return (
    <View style={[styles.banner, kind === 'error' ? styles.bannerError : styles.bannerInfo]} accessibilityRole="alert">
      <Text style={[type.body, { color: kind === 'error' ? colors.orange : colors.navy }]}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={type.h3}>{title}</Text>
      {text ? <Text style={[type.small, styles.emptyText]}>{text}</Text> : null}
    </View>
  );
}

// ---------- Liste déroulante à choix unique ----------
export function SelectPicker({
  label,
  required,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  options: { value: string | null; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Texte affiché quand rien n'est choisi (par défaut « Choisir »). */
  placeholder?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={styles.select}>
        <Text style={[type.body, !selected && { color: colors.muted }]}>
          {selected ? selected.label : (placeholder ?? t('common.choose'))}
        </Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.root}>
            <View style={styles.modalHeader}>
              <Text style={type.h2}>{label}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value ?? 'none'}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  style={[styles.row, item.value === value && styles.rowOn]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={type.body}>{item.label}</Text>
                </Pressable>
              )}
            />
            <View style={styles.footer}>
              <Button title={t('common.close')} variant="secondary" onPress={() => setOpen(false)} />
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

// ---------- Choix d'un pays ----------
export function CountryPicker({
  label,
  required,
  countries,
  value,
  onChange,
  allowAll = false,
}: {
  label: string;
  required?: boolean;
  countries: Country[];
  value: string | null;
  onChange: (code: string | null) => void;
  allowAll?: boolean;
}) {
  const { t, lang } = useI18n();
  const name = (c: Country) => (lang === 'fr' ? c.nameFr : c.nameEn);
  const options = [
    ...(allowAll ? [{ value: null, label: t('common.allCountries') }] : []),
    ...countries.map((c) => ({ value: c.code, label: `${name(c)} (${c.dialCode})` })),
  ];
  return (
    <SelectPicker
      label={label}
      required={required}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={allowAll ? t('common.allCountries') : undefined}
    />
  );
}

// ---------- Liste déroulante à choix multiples ----------
export function MultiSelectPicker({
  label,
  required,
  options,
  values,
  onChange,
}: {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const chosen = options.filter((o) => values.includes(o.value));
  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={styles.select}>
        <View style={styles.selectRow}>
          <Text style={[type.body, styles.flex, chosen.length === 0 && { color: colors.muted }]} numberOfLines={2}>
            {chosen.length ? chosen.map((o) => o.label).join(', ') : t('common.choose')}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </View>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.root}>
            <View style={styles.modalHeader}>
              <Text style={type.h2}>{label}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => {
                const on = values.includes(item.value);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={[styles.row, styles.checkRow, on && styles.rowOn]}
                    onPress={() => toggle(item.value)}
                  >
                    <View style={[styles.checkbox, on && styles.checkboxOn]}>
                      {on ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <Text style={type.body}>{item.label}</Text>
                  </Pressable>
                );
              }}
            />
            <View style={styles.footer}>
              <Button title={t('common.validate')} onPress={() => setOpen(false)} />
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.green },
  secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.green },
  ghost: { backgroundColor: 'transparent' },
  warning: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.orange },
});

const buttonTextStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.green },
  ghost: { color: colors.green },
  warning: { color: colors.orange },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: spacing.lg },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  button: {
    minHeight: 52,
    borderRadius: radius.button,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  field: { gap: spacing.xs },
  label: type.label,
  required: { color: colors.orange, fontWeight: '700' as const },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.orange },
  errorText: { fontSize: 14, color: colors.orange },
  hint: type.small,
  select: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  checkboxRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.xs },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.green },
  checkMark: { color: colors.white, fontWeight: '700' },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  chipTextOn: { color: colors.white },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  cardInner: { flexDirection: 'row' },
  cardAccent: { width: 6 },
  cardBody: { padding: spacing.lg, gap: spacing.xs },
  banner: { padding: spacing.md, borderRadius: radius.input },
  bannerError: { backgroundColor: colors.orangeSoft },
  bannerInfo: { backgroundColor: colors.greenSoft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { padding: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyText: { textAlign: 'center' },
  modalHeader: { padding: spacing.xl, paddingBottom: spacing.md },
  row: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowOn: { backgroundColor: colors.greenSoft },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chevron: { fontSize: 16, color: colors.muted },
});
