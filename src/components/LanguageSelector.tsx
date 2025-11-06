import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' }
];

export const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    
    // Save to localStorage
    localStorage.setItem('preferredLanguage', langCode);
    
    // Update user profile in Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: langCode })
        .eq('id', user.id);
    }
  };

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[140px] sm:w-[160px] h-9 sm:h-10 bg-background border-border">
        <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border z-50">
        {languages.map((lang) => (
          <SelectItem 
            key={lang.code} 
            value={lang.code}
            className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <span className="font-medium">{lang.nativeName}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
