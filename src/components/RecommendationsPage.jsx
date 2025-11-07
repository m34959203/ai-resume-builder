import EmptyDataBanner from './recommendations/EmptyDataBanner';
import { useTranslation } from '../hooks/useTranslation'; // твой хук

// ...
const { t } = useTranslation();

const missing = [];
if (!hasExperience) missing.push(t('builder.experience.label'));
if (!hasSkills)     missing.push(t('builder.skills.title'));
if (!hasEducation)  missing.push(t('builder.education.title') || 'Образование');
if (!hasSummary)    missing.push(t('builder.personal.summary'));

return (
  <EmptyDataBanner
    title={t('recommendations.needMoreData')}
    missing={missing}
    hint={t('recommendations.hint')}
    ctaLabel={t('recommendations.improveResume')}
    onCta={() => setCurrentPage('builder')}
  />
);
