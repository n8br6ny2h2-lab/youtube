# YouTube API Denetim Başvurusu — hazır cevaplar

Form: https://support.google.com/youtube/contact/yt_api_form
("YouTube API Services - Audit and Quota Extension Form")

Formda İngilizce cevap verin; aşağıdaki metinleri kopyalayıp yapıştırabilirsiniz.

| Alan | Cevap |
|---|---|
| Organization / Name | Bulutkent (individual channel owner) |
| Website | *(site adresi yayınlanınca)* `https://.../` |
| Privacy Policy URL | `https://.../privacy.html` |
| Terms of Service URL | `https://.../terms.html` |
| Google Cloud project number / ID | Google Cloud Console > proje seçici > **Project number** (proje kimliği: `smiling-basis-513909-v6`) |
| API client / OAuth client ID | `355033675589-dh5o56cfhpddivrstdcpsp9ofvfij2p1.apps.googleusercontent.com` |
| APIs used | YouTube Data API v3, YouTube Analytics API |
| Channel | https://www.youtube.com/@bulutkenttv |
| Users | 1 (only the channel owner) |
| Requested daily quota | 20,000 units (current default 10,000) |

### Use case description (English)

> Bulutkent Studio is an internal tool used only by me, the owner of the Bulutkent YouTube channel
> (youtube.com/@bulutkenttv), a channel of original Turkish animated stories for children aged 2-8.
> The tool uploads my own original animated videos to my own channel (videos.insert), sets custom
> thumbnails (thumbnails.set), adds videos to my playlists (playlists.insert, playlistItems.insert),
> uploads Turkish captions (captions.insert), sets scheduled publish times (status.publishAt) and marks
> every video as made for kids (selfDeclaredMadeForKids=true). It reads my own channel's YouTube
> Analytics reports (views, average view duration, subscribers gained) to plan future episodes.
> It also reads public video metadata (titles, view counts) through search.list and videos.list
> (chart=mostPopular) only for aggregate topic and trend analysis; no third-party content is
> downloaded, copied or re-uploaded. The tool is not offered to any other user. No personal data of
> viewers or children is collected. OAuth tokens are stored only on my own server with restricted file
> permissions and are never shared.

### Why more quota (English)

> I publish about 3 long episodes and 7 Shorts per week, each with a thumbnail, playlist assignment
> and captions. On production days the tool uploads up to 4 videos (about 6,600 units) plus
> research, playlist and analytics calls. 20,000 units per day gives headroom for re-uploads after
> processing failures and for caption uploads.

### Ekran görüntüleri
`docs/screenshots/` klasöründeki görüntüleri forma ekleyin (panel, takvim, iş emirleri, gizlilik sayfası).

### Google Cloud'da yapılacaklar (başvurudan önce)
1. **Google Auth Platform → Branding**: Application home page = site adresi, Privacy policy = `.../privacy.html`,
   Terms of service = `.../terms.html`, Authorized domains = sitenin alan adı.
2. **Audience → Publish app** (Test → In production). İzin 7 günde bir silinmez.
3. **Data access**: kullanılan kapsamlar listelenir (youtube, youtube.upload, youtube.force-ssl, yt-analytics.readonly).
