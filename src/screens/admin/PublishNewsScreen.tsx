import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { createNews, getCountries, uploadImage } from '../../api/endpoints';
import type { Country, NewsAudience } from '../../api/types';
import { Banner, Button, Chip, CountryPicker, Screen, TextField } from '../../components/ui';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../lib/errors';
import { colors, radius, spacing, type } from '../../theme';

const AUDIENCES: NewsAudience[] = ['ALL', 'PATIENT', 'PRACTITIONER'];
const isWebLink = (value: string) => /^https?:\/\/\S+$/.test(value);

/** Réduit la photo (1280 px de large, JPEG) avant l'envoi : rapide sur les réseaux mobiles. */
async function compress(uri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: 1280 }).renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

export default function PublishNewsScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const [countries, setCountries] = useState<Country[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [audience, setAudience] = useState<NewsAudience>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getCountries().then(setCountries).catch(() => undefined);
  }, []);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  }

  async function publish() {
    const video = videoUrl.trim();
    const link = linkUrl.trim();
    if (!title.trim()) return setError(t('news.errTitle'));
    if ((video && !isWebLink(video)) || (link && !isWebLink(link))) return setError(t('news.errLink'));
    setError(null);
    setSending(true);
    try {
      const imageUrl = photo ? (await uploadImage(await compress(photo))).url : undefined;
      await createNews({
        title: title.trim(),
        body: body.trim() || undefined,
        imageUrl,
        videoUrl: video || undefined,
        linkUrl: link || undefined,
        countryCode: country,
        audience,
      });
      Alert.alert(t('news.publishedTitle'), t('news.publishedText'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen footer={<Button title={t('news.publishAction')} onPress={publish} loading={sending} />}>
      <TextField label={t('news.title')} value={title} onChangeText={setTitle} maxLength={200} />
      <TextField
        label={t('news.body')}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={5000}
        style={styles.bodyInput}
      />

      <View style={styles.block}>
        <Text style={type.label}>{t('news.photo')}</Text>
        {photo ? (
          <View>
            <Image source={{ uri: photo }} style={styles.preview} resizeMode="cover" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('news.photoRemove')}
              onPress={() => setPhoto(null)}
              style={styles.remove}
            >
              <Ionicons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} style={styles.pick}>
            <Ionicons name="image-outline" size={28} color={colors.green} />
            <Text style={styles.pickText}>{t('news.photoPick')}</Text>
          </Pressable>
        )}
      </View>

      <TextField
        label={t('news.video')}
        value={videoUrl}
        onChangeText={setVideoUrl}
        placeholder="https://www.youtube.com/watch?v=…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        hint={t('news.videoHint')}
      />
      <TextField
        label={t('news.link')}
        value={linkUrl}
        onChangeText={setLinkUrl}
        placeholder="https://"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <CountryPicker label={t('news.country')} countries={countries} value={country} onChange={setCountry} allowAll />
      <View style={styles.block}>
        <Text style={type.label}>{t('news.audience')}</Text>
        <View style={styles.row}>
          {AUDIENCES.map((a) => (
            <Chip key={a} label={t(`news.audience.${a}`)} selected={audience === a} onPress={() => setAudience(a)} />
          ))}
        </View>
      </View>
      {error ? <Banner text={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bodyInput: { minHeight: 140, paddingVertical: spacing.md, textAlignVertical: 'top' },
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pick: {
    height: 120,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pickText: { fontSize: 15, fontWeight: '600', color: colors.green },
  preview: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.card },
  remove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 42, 71, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
