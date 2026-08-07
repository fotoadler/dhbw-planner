import Capacitor
import UIKit

/**
 * Die App nutzt die systemeigenen Safe Areas statt einer randlosen Darstellung.
 * So bleiben Statusleiste und Home-Indikator sichtbar und der Webinhalt kann
 * auf allen iPhone-Größen nicht unter ihnen verschwinden.
 */
final class ViewController: CAPBridgeViewController {
    override var prefersStatusBarHidden: Bool { false }

    // .default follows the current iOS interface style: dark content on a
    // light surface and light content on a dark surface.
    override var preferredStatusBarStyle: UIStatusBarStyle { .default }

    override var prefersHomeIndicatorAutoHidden: Bool { false }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        setNeedsStatusBarAppearanceUpdate()
    }
}
