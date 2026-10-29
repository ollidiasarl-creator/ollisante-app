import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../components/Brand';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { Button, Loading, Screen } from '../components/ui';
import { useI18n } from '../i18n';
import { colors, type } from '../theme';
import AdminCodeScreen from '../screens/auth/AdminCodeScreen';
import EmailLoginScreen from '../screens/auth/EmailLoginScreen';
import EmailRegisterScreen from '../screens/auth/EmailRegisterScreen';
import EmailVerifyScreen from '../screens/auth/EmailVerifyScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';
import PractitionerRegisterScreen from '../screens/auth/PractitionerRegisterScreen';
import ProInfoScreen from '../screens/auth/ProInfoScreen';
import StructureRegisterScreen from '../screens/auth/StructureRegisterScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import AdminPractitionersScreen from '../screens/admin/AdminPractitionersScreen';
import PublishNewsScreen from '../screens/admin/PublishNewsScreen';
import BookAgendaScreen from '../screens/patient/BookAgendaScreen';
import BookConfirmScreen from '../screens/patient/BookConfirmScreen';
import BookFacilityScreen from '../screens/patient/BookFacilityScreen';
import BookSpecialtyScreen from '../screens/patient/BookSpecialtyScreen';
import PaymentScreen from '../screens/patient/PaymentScreen';
import AddAvailabilityScreen from '../screens/practitioner/AddAvailabilityScreen';
import AvailabilityScreen from '../screens/practitioner/AvailabilityScreen';
import MyStructuresScreen from '../screens/practitioner/MyStructuresScreen';
import PractitionerProfileScreen from '../screens/practitioner/PractitionerProfileScreen';
import TrainingsScreen from '../screens/practitioner/TrainingsScreen';
import AccountScreen from '../screens/shared/AccountScreen';
import AppointmentsScreen from '../screens/shared/AppointmentsScreen';
import EmergencyScreen from '../screens/shared/EmergencyScreen';
import FaqScreen from '../screens/shared/FaqScreen';
import NewsDetailScreen from '../screens/shared/NewsDetailScreen';
import BillingScreen from '../screens/shared/BillingScreen';
import LegalScreen from '../screens/shared/LegalScreen';
import PreferencesScreen from '../screens/shared/PreferencesScreen';
import RelativeEditScreen from '../screens/shared/RelativeEditScreen';
import RelativesScreen from '../screens/shared/RelativesScreen';
import ChangePasswordScreen from '../screens/shared/ChangePasswordScreen';
import HomeScreen from '../screens/shared/HomeScreen';
import NewsFeedScreen from '../screens/shared/NewsFeedScreen';
import SearchScreen from '../screens/shared/SearchScreen';
import ProfileEditScreen from '../screens/shared/ProfileEditScreen';
import StructureDoctorsScreen from '../screens/structure/StructureDoctorsScreen';
import StructureHomeScreen from '../screens/structure/StructureHomeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.green,
    background: colors.white,
    card: colors.white,
    text: colors.navy,
    border: colors.border,
  },
};

const headerRight = () => <LanguageSwitch compact />;
/** L'emblème Ollisanté en haut à gauche de chaque écran (à côté de la flèche de retour s'il y en a une). */
const headerLeft = () => <BrandMark />;

const stackOptions = {
  headerRight,
  headerLeft,
  // iOS 26 : l'emblème sans la « bulle » de verre des boutons d'en-tête.
  unstable_headerLeftItems: () => [{ type: 'custom' as const, element: <BrandMark />, hidesSharedBackground: true }],
  headerBackVisible: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTitleAlign: 'left' as const,
  headerTintColor: colors.navy,
  headerTitleStyle: { fontWeight: '700' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.white },
};

function tabOptions(icons: Record<string, string>) {
  return ({ route }: { route: { name: string } }) => ({
    headerTitleStyle: { fontWeight: '700' as const, color: colors.navy },
    headerLeft,
    headerLeftContainerStyle: { paddingLeft: 16 },
    headerTitleAlign: 'left' as const,
    headerRight,
    headerRightContainerStyle: { paddingRight: 16 },
    headerShadowVisible: false,
    tabBarActiveTintColor: colors.green,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontSize: 12, fontWeight: '600' as const },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <Ionicons name={icons[route.name] as any} size={size} color={color} />
    ),
  });
}

const TAB_ICONS = {
  Home: 'home',
  Consultations: 'calendar',
  Trainings: 'school',
  Practitioners: 'medkit',
  Doctors: 'people',
  Account: 'person',
};

/** Professionnels : comme les patients, plus leurs formations. */
function PractitionerTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabOptions(TAB_ICONS)}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tab.home') }} />
      <Tab.Screen name="Consultations" component={AppointmentsScreen} options={{ title: t('tab.consultations') }} />
      <Tab.Screen name="Trainings" component={TrainingsScreen} options={{ title: t('tab.trainings') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: t('tab.account') }} />
    </Tab.Navigator>
  );
}

/** Patients : Accueil (prendre rendez-vous, prochain rendez-vous, actualités), Consultations, Compte. */
function MainTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabOptions(TAB_ICONS)}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tab.home') }} />
      <Tab.Screen name="Consultations" component={AppointmentsScreen} options={{ title: t('tab.consultations') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: t('tab.account') }} />
    </Tab.Navigator>
  );
}

/** Structures : tableau de bord, rendez-vous de tous leurs médecins, médecins rattachés, Compte. */
function StructureTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabOptions(TAB_ICONS)}>
      <Tab.Screen name="Home" component={StructureHomeScreen} options={{ title: t('tab.home') }} />
      <Tab.Screen name="Consultations" component={AppointmentsScreen} options={{ title: t('tab.appointments') }} />
      <Tab.Screen name="Doctors" component={StructureDoctorsScreen} options={{ title: t('tab.doctors') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: t('tab.account') }} />
    </Tab.Navigator>
  );
}

/** Administrateur : Accueil (publication des actualités), validation des praticiens et Compte. */
function AdminTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabOptions(TAB_ICONS)}>
      <Tab.Screen name="Home" component={NewsFeedScreen} options={{ title: t('tab.home') }} />
      <Tab.Screen name="Practitioners" component={AdminPractitionersScreen} options={{ title: t('tab.practitioners') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: t('tab.account') }} />
    </Tab.Navigator>
  );
}

function Unreachable() {
  const { t } = useI18n();
  const { retry } = useAuth();
  return (
    <Screen safe>
      <Text style={type.title}>{t('net.title')}</Text>
      <Text style={styles.text}>{t('net.text')}</Text>
      <Button title={t('common.retry')} onPress={retry} />
    </Screen>
  );
}

export function RootNavigator() {
  const { status, user } = useAuth();
  const { t } = useI18n();

  if (status === 'loading') return <Loading />;
  if (status === 'unreachable') return <Unreachable />;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={stackOptions}>
        {status === 'signedOut' ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} options={{ title: '' }} />
            <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: '' }} />
            <Stack.Screen name="EmailLogin" component={EmailLoginScreen} options={{ title: '' }} />
            <Stack.Screen name="AdminCode" component={AdminCodeScreen} options={{ title: '' }} />
            <Stack.Screen name="EmailRegister" component={EmailRegisterScreen} options={{ title: '' }} />
            <Stack.Screen name="EmailVerify" component={EmailVerifyScreen} options={{ title: '' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: '' }} />
            <Stack.Screen name="PractitionerRegister" component={PractitionerRegisterScreen} options={{ title: '' }} />
            <Stack.Screen name="StructureRegister" component={StructureRegisterScreen} options={{ title: '' }} />
            <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: '' }} />
            {/* Sans compte : on découvre, on cherche un médecin et ses créneaux ; la connexion n'est demandée que pour réserver. */}
            <Stack.Screen name="ProInfo" component={ProInfoScreen} options={{ title: '' }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: t('search.title') }} />
            <Stack.Screen name="BookFacility" component={BookFacilityScreen} options={{ title: t('appt.book') }} />
            <Stack.Screen name="BookSpecialty" component={BookSpecialtyScreen} options={{ title: '' }} />
            <Stack.Screen name="BookAgenda" component={BookAgendaScreen} options={{ title: '' }} />
            <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ title: t('emergency.screen') }} />
            <Stack.Screen name="Faq" component={FaqScreen} options={{ title: t('account.helpTitle') }} />
          </>
        ) : user?.role === 'PRACTITIONER' ? (
          <>
            <Stack.Screen name="PractitionerTabs" component={PractitionerTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Faq" component={FaqScreen} options={{ title: t('account.helpTitle') }} />
            <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ title: t('emergency.screen') }} />
            <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="Availability" component={AvailabilityScreen} options={{ title: t('tab.availability') }} />
            <Stack.Screen name="AddAvailability" component={AddAvailabilityScreen} options={{ title: t('avail.add') }} />
            <Stack.Screen name="MyStructures" component={MyStructuresScreen} options={{ title: t('account.structures') }} />
            <Stack.Screen name="PractitionerProfile" component={PractitionerProfileScreen} options={{ title: t('account.proProfile') }} />
            <Stack.Screen name="News" component={NewsFeedScreen} options={{ title: t('structure.news') }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t('account.password') }} />
            <Stack.Screen name="Billing" component={BillingScreen} options={{ title: t('account.billing') }} />
            <Stack.Screen name="Relatives" component={RelativesScreen} options={{ title: t('account.relatives') }} />
            <Stack.Screen name="RelativeEdit" component={RelativeEditScreen} options={{ title: t('relatives.editTitle') }} />
            <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ title: t('account.preferences') }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ title: t('account.legal') }} />
          </>
        ) : user?.role === 'PATIENT' ? (
          <>
            <Stack.Screen name="PatientTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: t('search.title') }} />
            <Stack.Screen name="Faq" component={FaqScreen} options={{ title: t('account.helpTitle') }} />
            <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ title: t('emergency.screen') }} />
            <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="BookFacility" component={BookFacilityScreen} options={{ title: t('appt.book') }} />
            <Stack.Screen name="BookSpecialty" component={BookSpecialtyScreen} options={{ title: '' }} />
            <Stack.Screen name="BookAgenda" component={BookAgendaScreen} options={{ title: '' }} />
            <Stack.Screen name="BookConfirm" component={BookConfirmScreen} options={{ title: '' }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: '' }} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: t('profile.title') }} />
            <Stack.Screen name="News" component={NewsFeedScreen} options={{ title: t('structure.news') }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t('account.password') }} />
            <Stack.Screen name="Billing" component={BillingScreen} options={{ title: t('account.billing') }} />
            <Stack.Screen name="Relatives" component={RelativesScreen} options={{ title: t('account.relatives') }} />
            <Stack.Screen name="RelativeEdit" component={RelativeEditScreen} options={{ title: t('relatives.editTitle') }} />
            <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ title: t('account.preferences') }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ title: t('account.legal') }} />
          </>
        ) : user?.role === 'STRUCTURE' ? (
          <>
            <Stack.Screen name="StructureTabs" component={StructureTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Faq" component={FaqScreen} options={{ title: t('account.helpTitle') }} />
            <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ title: t('emergency.screen') }} />
            <Stack.Screen name="News" component={NewsFeedScreen} options={{ title: t('structure.news') }} />
            <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t('account.password') }} />
            <Stack.Screen name="Billing" component={BillingScreen} options={{ title: t('account.billing') }} />
            <Stack.Screen name="Relatives" component={RelativesScreen} options={{ title: t('account.relatives') }} />
            <Stack.Screen name="RelativeEdit" component={RelativeEditScreen} options={{ title: t('relatives.editTitle') }} />
            <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ title: t('account.preferences') }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ title: t('account.legal') }} />
          </>
        ) : (
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Faq" component={FaqScreen} options={{ title: t('account.helpTitle') }} />
            <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ title: t('emergency.screen') }} />
            <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="PublishNews" component={PublishNewsScreen} options={{ title: t('news.publish') }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 16, lineHeight: 23, color: colors.navy },
});
