# Gizlilik Politikası - Rollercoin Kazanç Hesaplayıcı

**Son Güncelleme:** 3 Şubat 2026

## 🔒 Güvenlik Taahhüdü

Bu eklenti **açık kaynak** olarak geliştirilmiştir. Tüm kaynak kodlarını [GitHub'da](https://github.com/USER/RollercoinExtension) inceleyebilirsiniz.

## Toplanan Veriler

Bu eklenti aşağıdaki verileri **yalnızca yerel olarak** toplar ve işler:

- **Mining Gücü Bilgisi:** Rollercoin.com API'sinden mining gücünüzü okur
- **Bakiye Bilgisi:** Rollercoin WebSocket'inden bakiyenizi okur (çekim süreleri hesabı için)
- **Kullanıcı Tercihleri:** Seçilen para birimi ve dil tercihleri

## ❌ Toplamadığımız Veriler

- Şifreleriniz
- E-posta adresiniz
- Kişisel bilgileriniz
- Cüzdan adresleriniz

## Veri Paylaşımı

- **Hiçbir veri harici sunuculara GÖNDERİLMEZ**
- Tüm veriler tarayıcınızda (chrome.storage.local) yerel olarak saklanır
- Analytics, tracking veya telemetri YOKTUR

## Harici API Kullanımı

| API | Amaç | Gönderilen Veri |
|-----|------|-----------------|
| Binance API | Fiyat bilgisi | Hiçbir kullanıcı verisi |

## İzinler ve Neden Gerekli

| İzin | Neden Gerekli |
|------|---------------|
| `storage` | Tercihlerinizi kaydetmek için |
| `activeTab` | Rollercoin sayfasından veri okumak için |
| `scripting` | Content script çalıştırmak için |
| `host_permissions` | Sadece rollercoin.com ve binance.com'a erişim |

## Kaynak Kod

Tüm kaynak kod açıktır ve incelenebilir:
- GitHub: https://github.com/USER/RollercoinExtension
- İnceleme yapmak ve katkıda bulunmak için PR'lar kabul edilmektedir

## İletişim

Sorularınız için: support@buraktemelkaya.com

## Değişiklikler

Bu gizlilik politikası herhangi bir zamanda güncellenebilir.
