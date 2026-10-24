import ExpoModulesCore
import PDFKit
import UIKit
import UniformTypeIdentifiers
import Vision

/// LE LECTEUR DE TICKET (E84, 2026-10-24). Fondateur : « on part sur le nouveau build » — la lecture
/// se fait sur l'iPhone, rien ne quitte le téléphone. Lu par `lib/lecteurTicket.ts`
/// (`requireOptionalNativeModule('KyrozTicket')`) ; le texte rendu passe ensuite par
/// `lib/ticketCaisse.ts`, qui le découpe et le rapproche de la liste.
///
/// Mesuré sur Mac avec les mêmes briques, sur de vrais tickets E.Leclerc :
///  · le PDF de l'appli de l'enseigne (PDFKit) se lit EXACTEMENT — une ligne par article, prix au bout ;
///  · une image (Vision) perd quelques lignes : la police étroite du ticket trompe la reconnaissance.
public class KyrozTicketModule: Module {
  /// Le délégué du sélecteur doit vivre jusqu'au choix : UIKit ne le retient pas.
  private var delegue: DelegueSelecteurPdf?

  public func definition() -> ModuleDefinition {
    Name("KyrozTicket")

    /// Présente le sélecteur de fichiers (PDF seulement) ; rend le texte du PDF, ou `nil` si annulé.
    AsyncFunction("choisirEtLirePdf") { (promise: Promise) in
      guard let vue = self.appContext?.utilities?.currentViewController() else {
        promise.reject("E_VUE", "Aucun écran pour présenter le sélecteur")
        return
      }
      let selecteur = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.pdf], asCopy: true)
      let delegue = DelegueSelecteurPdf { url in
        self.delegue = nil
        guard let url = url else { promise.resolve(nil); return }
        guard let pdf = PDFDocument(url: url) else {
          promise.reject("E_PDF", "Ce PDF ne se lit pas")
          return
        }
        promise.resolve(pdf.string ?? "")
      }
      self.delegue = delegue
      selecteur.delegate = delegue
      selecteur.allowsMultipleSelection = false
      vue.present(selecteur, animated: true)
    }.runOnQueue(.main)

    /// Le texte reconnu sur une image (fichier local : photo ou capture d'écran), ligne par ligne.
    AsyncFunction("texteDeLImage") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri), let donnees = try? Data(contentsOf: url),
            let image = UIImage(data: donnees), let cg = image.cgImage else {
        promise.reject("E_IMAGE", "Cette image ne se lit pas")
        return
      }
      let requete = VNRecognizeTextRequest { requete, erreur in
        if let erreur = erreur {
          promise.reject("E_VISION", erreur.localizedDescription)
          return
        }
        promise.resolve(lignes(requete.results as? [VNRecognizedTextObservation] ?? []))
      }
      requete.recognitionLevel = .accurate
      requete.recognitionLanguages = ["fr-FR"]
      // Pas de correction de langue : elle « corrige » les abréviations du ticket (« CREM FRAIC »).
      requete.usesLanguageCorrection = false
      let gestionnaire = VNImageRequestHandler(cgImage: cg, orientation: orientation(image.imageOrientation), options: [:])
      DispatchQueue.global(qos: .userInitiated).async {
        do { try gestionnaire.perform([requete]) } catch { promise.reject("E_VISION", error.localizedDescription) }
      }
    }
  }
}

/// Vision rend des MORCEAUX de texte (le libellé, puis le prix, à part). On les regroupe en lignes
/// de même hauteur, de gauche à droite, séparés par trois espaces : le prix finit la ligne, comme
/// dans le PDF, et `lib/ticketCaisse.ts` les lit de la même façon.
private func lignes(_ observations: [VNRecognizedTextObservation]) -> String {
  struct Morceau { let y: CGFloat; let x: CGFloat; let h: CGFloat; let texte: String }
  let morceaux = observations.compactMap { o -> Morceau? in
    guard let t = o.topCandidates(1).first?.string else { return nil }
    return Morceau(y: o.boundingBox.midY, x: o.boundingBox.minX, h: o.boundingBox.height, texte: t)
  }.sorted { $0.y > $1.y }
  var groupes: [[Morceau]] = []
  for m in morceaux {
    if let ref = groupes.last?.first, abs(ref.y - m.y) < max(ref.h, m.h) * 0.5 {
      groupes[groupes.count - 1].append(m)
    } else {
      groupes.append([m])
    }
  }
  return groupes.map { $0.sorted { $0.x < $1.x }.map(\.texte).joined(separator: "   ") }.joined(separator: "\n")
}

private func orientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
  switch o {
  case .up: return .up
  case .down: return .down
  case .left: return .left
  case .right: return .right
  case .upMirrored: return .upMirrored
  case .downMirrored: return .downMirrored
  case .leftMirrored: return .leftMirrored
  case .rightMirrored: return .rightMirrored
  @unknown default: return .up
  }
}

private final class DelegueSelecteurPdf: NSObject, UIDocumentPickerDelegate {
  private let fini: (URL?) -> Void
  init(_ fini: @escaping (URL?) -> Void) { self.fini = fini }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { fini(urls.first) }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { fini(nil) }
}
