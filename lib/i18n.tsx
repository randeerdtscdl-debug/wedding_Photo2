'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'en' | 'si';

const en = {
  tagline: 'Share the moments you love',
  slideshow: 'Slideshow', slideshowAria: 'Open slideshow in a new tab',
  langBtn: 'සිංහල',
  close: 'Close', loadMore: 'Load more',
  latest: 'Latest', mostLiked: 'Most liked', allTables: 'All tables', tableN: 'Table {n}', filterTable: 'Filter by table',
  tabMedia: 'Photos & Videos', tabVoice: 'Voice Wishes',
  nothing: 'Nothing here yet', emptyMedia: 'Be the first to share a moment.', emptyVoice: 'Be the first to leave a voice wish.',
  fabVoice: 'Record a voice wish', fabMedia: 'Upload photo or video',
  noticeApproved: 'Your upload was approved and is now in the gallery.',
  thanksMedia: 'Thank you! Your upload is waiting for the hosts to approve it.',
  thanksVoice: 'Thank you! Your voice wish is waiting for the hosts to approve it.',
  pendingOne: 'Your upload is waiting for approval', pendingMany: '{n} uploads are waiting for approval',
  pendingSub: 'It will appear in the feed as soon as the hosts approve it.',
  like: '{n} like', likes: '{n} likes', likeAria: 'Like', unlikeAria: 'Unlike', seeLikes: 'See who liked this', commentsAria: 'Comments',
  likedBy: 'Liked by {n}', noLikes: 'No likes yet', likesError: 'Could not load the list. Please try again.',
  comments: 'Comments', firstComment: 'Be the first to leave a kind word', commentPh: 'Write a comment…', send: 'Send',
  playVoice: 'Play voice wish', pauseVoice: 'Pause voice wish',
  justNow: 'just now', minAgo: '{n}m ago', hrAgo: '{n}h ago', dayAgo: '{n}d ago',
  // upload
  shareMoment: 'Share a moment', chooseMedia: 'Take or choose photos & videos', upTo: 'Up to {n} files · videos up to {mb} MB',
  captionPh: 'Add a caption (optional)', watermark: 'Add “{w}” to photos',
  reviewUpload: 'The hosts review every upload before it appears in the gallery.', change: 'Change', sendApproval: 'Send for approval',
  videoSkipped: 'Some videos are over {mb} MB and were skipped. Pick a shorter clip (about 20–30 seconds).',
  videoLbl: 'Video {tag}', photoLbl: 'Photo {tag}', uploadFailed: 'Upload failed. Check your connection and try again.',
  // voice
  voiceTitle: 'Leave a voice wish', tapRecord: 'Tap to record your wish', recordingHint: 'Recording… tap to stop (max {max})',
  chooseAudio: 'or choose an audio file', recordAgain: 'Record again', writtenWish: 'Add a written wish too (optional)',
  reviewWish: 'The hosts review every wish before it appears in the gallery.', uploadingPct: 'Uploading · {p}%',
  stopAria: 'Stop recording', startAria: 'Start recording',
  errNoRec: 'Recording is not supported in this browser. Open the link in Chrome / Safari, or choose an audio file.',
  errMic: 'Microphone permission was denied. Please allow the microphone and try again.',
  errFileBig: 'That file is over {mb} MB.', errBadAudio: 'Please choose an mp3 / m4a / wav / webm audio file.',
  errTooLong: 'Please keep voice wishes under 5 minutes.', errCantRead: 'Could not read that audio file.',
  // onboarding
  welcomeGallery: 'Welcome to our wedding gallery', yourPhone: 'Your phone number',
  phoneHint: "Joined before? Enter the same number and we'll bring you straight back in. Only the hosts can see your number.",
  continue: 'Continue', checking: 'Checking…', welcomeBack: 'Welcome back!', continueAs: 'Continue as {name}', signingIn: 'Signing in…',
  editDetails: 'Edit my details', notMe: "This isn't me",
  profilePic: 'Profile picture', tapAdd: 'tap to add', tapChange: 'tap to change', addPhoto: 'Add photo',
  yourName: 'Your name', namePh: 'e.g. Nimal Perera', tableNumber: 'Table number', tablePh: 'e.g. 5',
  phoneNumber: 'Phone number', phonePh: 'e.g. 0771234567',
  phonePrivacy: 'Only the hosts can see your phone number. Other guests see your name, table and picture.',
  join: 'Join the gallery', joining: 'Joining…', pleaseWait: 'Please wait…',
  alreadyJoined: "You've already joined!", registeredAs: 'This phone number is registered as', isThisYou: 'Is this you?',
  yesContinue: 'Yes, continue as {name}', noSomeoneElse: "No, I'm someone else",
  errPhone: 'Please enter a valid phone number (e.g. 0771234567).', errAvatar: 'Please add your profile picture.',
  errPicRead: 'Could not read that picture. Please choose another one.', errJoin: 'Could not join. Check your connection and try again.',
} as const;

type Key = keyof typeof en;

const si: Record<Key, string> = {
  tagline: 'ඔබ ආදරය කරන මොහොත බෙදාගන්න',
  slideshow: 'ස්ලයිඩ්ෂෝ', slideshowAria: 'ස්ලයිඩ්ෂෝ එක අලුත් tab එකකින් විවෘත කරන්න',
  langBtn: 'English',
  close: 'වසන්න', loadMore: 'තවත් පෙන්වන්න',
  latest: 'අලුත්ම', mostLiked: 'වැඩිපුරම ලයික්', allTables: 'සියලුම මේස', tableN: 'මේසය {n}', filterTable: 'මේසය අනුව පෙරන්න',
  tabMedia: 'ඡායාරූප සහ වීඩියෝ', tabVoice: 'හඬ සුබ පැතුම්',
  nothing: 'තවම කිසිවක් නැත', emptyMedia: 'පළමුවෙන්ම මොහොතක් බෙදාගන්න.', emptyVoice: 'පළමුවෙන්ම හඬ සුබ පැතුමක් තබන්න.',
  fabVoice: 'හඬ සුබ පැතුමක් පටිගත කරන්න', fabMedia: 'ඡායාරූප හෝ වීඩියෝ උඩුගත කරන්න',
  noticeApproved: 'ඔබේ උඩුගත කිරීම අනුමත විය, දැන් ගැලරියේ පෙනේ.',
  thanksMedia: 'ස්තූතියි! ඔබේ උඩුගත කිරීම සත්කාරකයන්ගේ අනුමැතිය සඳහා රැඳී සිටී.',
  thanksVoice: 'ස්තූතියි! ඔබේ හඬ සුබ පැතුම සත්කාරකයන්ගේ අනුමැතිය සඳහා රැඳී සිටී.',
  pendingOne: 'ඔබේ උඩුගත කිරීම අනුමැතිය සඳහා රැඳී සිටී', pendingMany: 'උඩුගත කිරීම් {n}ක් අනුමැතිය සඳහා රැඳී සිටී',
  pendingSub: 'සත්කාරකයන් අනුමත කළ සැණින් එය ගැලරියේ පෙනෙනු ඇත.',
  like: 'ලයික් {n}', likes: 'ලයික් {n}', likeAria: 'ලයික් කරන්න', unlikeAria: 'ලයික් ඉවත් කරන්න', seeLikes: 'ලයික් කළ අය බලන්න', commentsAria: 'අදහස්',
  likedBy: 'ලයික් කළ අය {n}', noLikes: 'තවම ලයික් නැත', likesError: 'ලැයිස්තුව පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  comments: 'අදහස්', firstComment: 'පළමුවෙන්ම කරුණාවන්ත වචනයක් තබන්න', commentPh: 'අදහසක් ලියන්න…', send: 'යවන්න',
  playVoice: 'හඬ පණිවිඩය වාදනය කරන්න', pauseVoice: 'හඬ පණිවිඩය නවත්වන්න',
  justNow: 'දැන්ම', minAgo: 'මිනිත්තු {n}කට පෙර', hrAgo: 'පැය {n}කට පෙර', dayAgo: 'දින {n}කට පෙර',
  shareMoment: 'මොහොතක් බෙදාගන්න', chooseMedia: 'ඡායාරූප සහ වීඩියෝ ගන්න හෝ තෝරන්න', upTo: 'ගොනු {n}ක් දක්වා · වීඩියෝ {mb} MB දක්වා',
  captionPh: 'සිරස්තලයක් එක් කරන්න (අවශ්‍ය නම්)', watermark: 'ඡායාරූපවලට “{w}” එක් කරන්න',
  reviewUpload: 'සෑම උඩුගත කිරීමක්ම ගැලරියේ පෙනීමට පෙර සත්කාරකයන් විසින් පරීක්ෂා කරයි.', change: 'වෙනස් කරන්න', sendApproval: 'අනුමැතිය සඳහා යවන්න',
  videoSkipped: 'වීඩියෝ කිහිපයක් {mb} MB ට වඩා විශාල නිසා අත්හැරියා. කෙටි වීඩියෝවක් (තත්පර 20–30ක් පමණ) තෝරන්න.',
  videoLbl: 'වීඩියෝව {tag}', photoLbl: 'ඡායාරූපය {tag}', uploadFailed: 'උඩුගත කිරීම අසාර්ථකයි. සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
  voiceTitle: 'හඬ සුබ පැතුමක් තබන්න', tapRecord: 'ඔබේ සුබ පැතුම පටිගත කිරීමට ඔබන්න', recordingHint: 'පටිගත කරමින්… නැවැත්වීමට ඔබන්න (උපරිම {max})',
  chooseAudio: 'නැතහොත් ශ්‍රව්‍ය ගොනුවක් තෝරන්න', recordAgain: 'නැවත පටිගත කරන්න', writtenWish: 'ලිඛිත සුබ පැතුමක් ද එක් කරන්න (අවශ්‍ය නම්)',
  reviewWish: 'සෑම සුබ පැතුමක්ම ගැලරියේ පෙනීමට පෙර සත්කාරකයන් විසින් පරීක්ෂා කරයි.', uploadingPct: 'උඩුගත කරමින් · {p}%',
  stopAria: 'පටිගත කිරීම නවත්වන්න', startAria: 'පටිගත කිරීම අරඹන්න',
  errNoRec: 'මෙම බ්‍රවුසරයේ පටිගත කිරීම සහාය නොදක්වයි. Chrome / Safari වලින් විවෘත කරන්න, නැතහොත් ශ්‍රව්‍ය ගොනුවක් තෝරන්න.',
  errMic: 'මයික්‍රොෆෝනයට අවසර ලබා දී නැත. අවසර දී නැවත උත්සාහ කරන්න.',
  errFileBig: 'එම ගොනුව {mb} MB ට වඩා විශාලයි.', errBadAudio: 'කරුණාකර mp3 / m4a / wav / webm ශ්‍රව්‍ය ගොනුවක් තෝරන්න.',
  errTooLong: 'හඬ සුබ පැතුම් මිනිත්තු 5ට අඩු විය යුතුය.', errCantRead: 'එම ශ්‍රව්‍ය ගොනුව කියවිය නොහැකි විය.',
  welcomeGallery: 'අපේ විවාහ ගැලරියට සාදරයෙන් පිළිගනිමු', yourPhone: 'ඔබේ දුරකථන අංකය',
  phoneHint: 'කලින් එක්වී ඇත්නම් එම අංකයම ඇතුළත් කරන්න — ඔබව කෙලින්ම ඇතුළට ගන්නෙමු. ඔබේ අංකය දැකිය හැක්කේ සත්කාරකයන්ට පමණි.',
  continue: 'ඉදිරියට', checking: 'පරීක්ෂා කරමින්…', welcomeBack: 'නැවත සාදරයෙන් පිළිගනිමු!', continueAs: '{name} ලෙස ඉදිරියට', signingIn: 'ඇතුළු වෙමින්…',
  editDetails: 'මගේ විස්තර වෙනස් කරන්න', notMe: 'මේ මම නොවේ',
  profilePic: 'ප්‍රොෆයිල් පින්තූරය', tapAdd: 'එකතු කිරීමට ඔබන්න', tapChange: 'වෙනස් කිරීමට ඔබන්න', addPhoto: 'පින්තූරයක් දමන්න',
  yourName: 'ඔබේ නම', namePh: 'උදා: නිමල් පෙරේරා', tableNumber: 'මේස අංකය', tablePh: 'උදා: 5',
  phoneNumber: 'දුරකථන අංකය', phonePh: 'උදා: 0771234567',
  phonePrivacy: 'ඔබේ දුරකථන අංකය දැකිය හැක්කේ සත්කාරකයන්ට පමණි. අනෙක් අමුත්තන්ට ඔබේ නම, මේසය සහ පින්තූරය පෙනේ.',
  join: 'ගැලරියට එක්වන්න', joining: 'එක්වෙමින්…', pleaseWait: 'මොහොතක් රැඳී සිටින්න…',
  alreadyJoined: 'ඔබ දැනටමත් එක්වී ඇත!', registeredAs: 'මෙම දුරකථන අංකය ලියාපදිංචි වී ඇත්තේ', isThisYou: 'මෙය ඔබද?',
  yesContinue: 'ඔව්, {name} ලෙස ඉදිරියට', noSomeoneElse: 'නැහැ, මම වෙනත් කෙනෙක්',
  errPhone: 'කරුණාකර නිවැරදි දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).', errAvatar: 'කරුණාකර ඔබේ ප්‍රොෆයිල් පින්තූරය එක් කරන්න.',
  errPicRead: 'එම පින්තූරය කියවිය නොහැකි විය. වෙනත් එකක් තෝරන්න.', errJoin: 'එක්වීමට නොහැකි විය. සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
};

const dict = { en, si } as const;
export type TFn = (key: Key, vars?: Record<string, string | number>) => string;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: TFn };
const LangCtx = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => en[k] });
export const useLang = () => useContext(LangCtx);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try { const saved = localStorage.getItem('lang'); if (saved === 'si' || saved === 'en') setLangState(saved); } catch { /* ignore */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  }, []);

  const t = useCallback<TFn>((key, vars) => {
    let s: string = dict[lang][key] ?? en[key];
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}
