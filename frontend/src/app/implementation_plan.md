# Reddit-Style Mobile Navigation Refactor

Bu plan, uygulamanın mobil navigasyon yapısını Reddit uygulamasındaki gibi daha düzenli ve çakışmasız bir yapıya geçirmeyi hedefler.

## Goal Description
- **Profil Butonu (Bottom Nav)**: Bottom nav'daki profil sekmesi artık tam ekran bir menü açmak yerine, ekranın altından çıkan kompakt bir "Bottom Sheet" (popup) açacak. Sadece profil, profili düzenle, dil, tema ve çıkış yap seçeneklerini barındıracak.
- **Hamburger Menü (Sol Üst)**: Sayfaların sol üst kısmına bir hamburger ikonu eklenecek. Bu ikon sol taraftan bir "Drawer" açacak. Drawer içinde Topluluklar, Favoriler, Ayarlar (İçe Aktarma), Admin Paneli ve Moderasyon seçenekleri yer alacak.
- **Çakışmayı Önleme (No Overlay)**: Hamburger ikonunu içeren üst çubuk (Mobile Top Bar), sayfa içeriklerinin üstüne binmeyecek (overlay). `main-content` flex-column yapısına geçirilerek, üst çubuk sayfa akışının bir parçası haline getirilecek.
- **Akış Sayfası Gizliliği**: Reels formatındaki Feed sayfasının tam ekran deneyimini bozmamak için üst çubuk (ve hamburger menü) Feed sayfasında tamamen gizlenecek.

## User Review Required
> [!IMPORTANT]
> - `explore`, `messages`, `communities` gibi sayfalarda daha önce `height: 100vh` veya `100dvh` kullanılan yerler `height: 100%` olarak güncellenecek. Bu sayede üstteki menü çubuğu sayfayı aşağı ittiğinde alt kısımdan taşma yaşanmayacak. Bu değişiklik global yapıya daha uygun olacaktır.

## Proposed Changes

### 1. App Component (Global State & Layout)
#### [MODIFY] [app.ts](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/app.ts)
- `AuthService`, `ProfileService` eklenecek (Kullanıcı adı ve avatarı sol drawer'da göstermek için).
- Sol drawer state'i (`isLeftDrawerOpen`) eklenecek.
- Route değiştiğinde sayfanın "feed" sayfası olup olmadığını kontrol eden bir mantık (`isFeedPage`) eklenecek. (Buna göre üst çubuğu gizleyeceğiz).
- `ImportFoldersDialog` `mobile-nav`'dan buraya taşınacak.
- Dil ve tema ayarları (drawer içi için) buraya eklenecek.

#### [MODIFY] [app.html](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/app.html)
- `main-content` içerisine, `router-outlet`'in hemen üstüne bir `mobile-top-bar` div'i eklenecek (hamburger menü ikonunu barındıracak). Sadece `!isFeedPage && isMobile` durumunda görünecek.
- Sol taraftan açılacak olan `left-drawer` menüsü eklenecek.
- `router-outlet`, yüksekliği kontrol edebilmemiz için bir `route-wrapper` içerisine alınacak.

#### [MODIFY] [app.css](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/app.css)
- `main-content`'e `display: flex; flex-direction: column;` verilecek.
- `mobile-top-bar` için `height: 48px; display: flex; align-items: center;` gibi stiller yazılacak. Bu sayede sayfanın doğal bir parçası olup diğer elemanların üstüne binmeyecek.
- `left-drawer` ve `left-drawer-scrim` için stiller eklenecek (soldan sağa slide in).

---

### 2. Mobile Nav Component (Bottom Sheet Dönüşümü)
#### [MODIFY] [mobile-nav.ts](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/shared/mobile-nav/mobile-nav.ts)
- Admin paneli, topluluklar, favoriler gibi navigasyon işlemleri çıkartılacak.
- `ImportFoldersDialog` yönetimi kaldırılacak (app'e taşındı).
- Sadece `isProfileSheetOpen` state'i kalacak.

#### [MODIFY] [mobile-nav.html](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/shared/mobile-nav/mobile-nav.html)
- `nav-profile-drawer` div'i çıkartılıp, `nav-profile-bottom-sheet` yapısına dönüştürülecek. İçerisinde sadece profil resmi, username, profile git, edit profile, çıkış yap, dil ve tema yer alacak.

#### [MODIFY] [mobile-nav.css](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/shared/mobile-nav/mobile-nav.css)
- Bottom sheet animasyonları ve stilleri yazılacak (aşağıdan yukarı slide up).
- Eski right-drawer stilleri temizlenecek.

---

### 3. Page Height Corrections (Viewport Updates)
Sayfaların üst çubuk nedeniyle alta taşmasını engellemek için `height: 100vh` kullanan sayfalardaki yükseklikler `height: 100%` olarak güncellenecek.
#### [MODIFY] [explore.css](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/features/explore/explore.css)
#### [MODIFY] [messages.css](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/features/messages/messages.css)
#### [MODIFY] [communities.css](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/features/communities/communities.css)
#### [MODIFY] [community-detail.css](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/features/community-detail/community-detail.css)
#### [MODIFY] [favorites.css](file:///c:/Users/Murat61/Documents/GitHub/highligt-vault/frontend/src/app/features/favorites/favorites.css)

> **Not:** `feed.css` içindeki `height: 100dvh` dokunulmayacak, çünkü üst çubuk bu sayfada gizleneceğinden dolayı sayfa zaten tam ekran çalışmaya devam edecek.

## Verification Plan
1. Uygulama mobil görünümde açılacak.
2. Feed sayfasında sol üstte hamburger menünün **görünmediği** ve sayfanın reels formatında tam ekran kaldığı teyit edilecek.
3. Explore veya Library sayfasına geçilecek. Sol üstte çakışma olmadan duran hamburger ikonu test edilecek.
4. Hamburger menüye tıklanıp sol drawer'ın doğru açıldığı ve linklerin (Topluluklar vb.) çalıştığı görülecek.
5. Bottom nav'daki profil butonuna basıldığında ekranın altından profil işlemlerini içeren popup sheet'in açıldığı doğrulanacak.
