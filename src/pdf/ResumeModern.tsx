// src/pdf/ResumePDF.tsx (или где он у тебя)
import './fonts';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Inter', fontSize: 12 }, // <-- главный шрифт
  name: { fontSize: 22, fontWeight: 700, marginBottom: 8 }, // <-- жирный Inter
  contact: { fontSize: 11 },
});

export default function ResumePDF({ profile, template }: any) {
  return (
    <Document title="Resume_modern">
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.name}>{profile.fullName || 'Имя Фамилия'}</Text>
          <Text style={styles.contact}>
            {profile.email || 'email@example.com'}  •  {profile.phone || '+7…'}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
