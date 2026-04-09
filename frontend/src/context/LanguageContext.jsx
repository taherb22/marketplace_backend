import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const translations = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.cart': 'Cart',
    'nav.logout': 'Logout',
    'nav.login': 'Log In',
    'nav.signup': 'Sign Up',
    'nav.admin': 'Admin',
    'nav.seller': 'Become a Seller',
    'nav.sell_item': 'Sell Item',
    'nav.pending': 'Pending Review',
    'home.hero.title': 'Discover Unique Products',
    'home.hero.subtitle': 'The best marketplace for exclusive items and digital assets.',
    'home.search': 'Search products...',
    'product.add_to_cart': 'Add to Cart',
    'product.sold_out': 'Sold Out',
    'product.stock': 'Stock',
    'product.no_image': 'No Image',
    'product.back': 'Back',
    'product.in_stock': 'In Stock',
    'cart.title': 'Your Cart',
    'cart.empty': 'Your cart is empty.',
    'cart.checkout': 'Proceed to Checkout',
    'cart.total': 'Total',
    'cart.close': 'Close Cart',
    'checkout.shipping': 'Shipping Information',
    'checkout.name': 'Full Name',
    'checkout.address': 'Delivery Address',
    'checkout.phone': 'Phone Number',
    'checkout.place_order': 'Place Order',
    'checkout.success': 'Order Placed Successfully!',
    'checkout.success_sub': 'You will be contacted soon to confirm your order.',
  },
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.cart': 'Panier',
    'nav.logout': 'Se déconnecter',
    'nav.login': 'Se connecter',
    'nav.signup': 'S\'inscrire',
    'nav.admin': 'Admin',
    'nav.seller': 'Devenir Vendeur',
    'nav.sell_item': 'Vendre un article',
    'nav.pending': 'En attente',
    'home.hero.title': 'Découvrez des produits uniques',
    'home.hero.subtitle': 'Le meilleur marché pour des articles exclusifs.',
    'home.search': 'Rechercher des produits...',
    'product.add_to_cart': 'Ajouter au panier',
    'product.sold_out': 'Épuisé',
    'product.stock': 'Stock',
    'product.no_image': 'Pas d\'image',
    'product.back': 'Retour',
    'product.in_stock': 'En stock',
    'cart.title': 'Votre Panier',
    'cart.empty': 'Votre panier est vide.',
    'cart.checkout': 'Passer à la caisse',
    'cart.total': 'Total',
    'cart.close': 'Fermer le panier',
    'checkout.shipping': 'Informations de livraison',
    'checkout.name': 'Nom complet',
    'checkout.address': 'Adresse de livraison',
    'checkout.phone': 'Numéro de téléphone',
    'checkout.place_order': 'Passer la commande',
    'checkout.success': 'Commande passée avec succès !',
    'checkout.success_sub': 'Vous serez contacté prochainement pour confirmer.',
  },
  ar: {
    'nav.dashboard': 'لوحة القيادة',
    'nav.cart': 'عربة التسوق',
    'nav.logout': 'تسجيل خروج',
    'nav.login': 'تسجيل الدخول',
    'nav.signup': 'إنشاء حساب',
    'nav.admin': 'مشرف',
    'nav.seller': 'كن بائعاً',
    'nav.sell_item': 'بيع منتج',
    'nav.pending': 'قيد المراجعة',
    'home.hero.title': 'اكتشف منتجات فريدة',
    'home.hero.subtitle': 'أفضل سوق للعناصر الحصرية والأصول الرقمية.',
    'home.search': 'البحث عن منتجات...',
    'product.add_to_cart': 'أضف إلى السلة',
    'product.sold_out': 'نفد المبيعات',
    'product.stock': 'المخزون',
    'product.no_image': 'لا توجد صورة',
    'product.back': 'رجوع',
    'product.in_stock': 'متوفر',
    'cart.title': 'عربة التسوق الخاصة بك',
    'cart.empty': 'عربة التسوق فارغة.',
    'cart.checkout': 'إتمام الدفع',
    'cart.total': 'الإجمالي',
    'cart.close': 'إغلاق السلة',
    'checkout.shipping': 'معلومات الشحن',
    'checkout.name': 'الاسم الكامل',
    'checkout.address': 'عنوان التسليم',
    'checkout.phone': 'رقم الهاتف',
    'checkout.place_order': 'إتمام الطلب',
    'checkout.success': 'تم تقديم الطلب بنجاح!',
    'checkout.success_sub': 'سيتم التواصل معك قريباً لتأكيد طلبك.',
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const { profile } = useAuth();
  
  // Default to english, but load from localStorage if available
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('dream-lang') || 'en';
  });

  // Sync to profile.lang if user logs in and it's different
  useEffect(() => {
    if (profile?.lang && profile.lang !== lang) {
      setLang(profile.lang);
      localStorage.setItem('dream-lang', profile.lang);
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('dream-lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key) => {
    return translations[lang]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useTranslation = () => useContext(LanguageContext);
