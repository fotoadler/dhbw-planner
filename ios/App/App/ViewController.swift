import Capacitor
import UIKit

/**
 * Die App nutzt die systemeigenen Safe Areas statt einer randlosen Darstellung.
 * So bleiben Statusleiste und Home-Indikator sichtbar und der Webinhalt kann
 * auf allen iPhone-Größen nicht unter ihnen verschwinden.
 */
final class ViewController: CAPBridgeViewController {
    override var prefersStatusBarHidden: Bool { false }

    override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }

    override var prefersHomeIndicatorAutoHidden: Bool { false }
}
