document.addEventListener('DOMContentLoaded', function() {
    OpenSeadragon({
        id: 'contentDiv',
        prefixUrl: 'images/buttons/',
        tileSources: {
            Image: {
                xmlns: 'http://schemas.microsoft.com/deepzoom/2008',
                Url: 'http://openseadragon.github.io/example-images/duomo/duomo_files/',
                Format: 'jpg',
                Overlap: '1',
                TileSize: '256',
                Size: {
                    Width:  '13920',
                    Height: '10200'
                }
            }
        }
    }).selection({
        onSelection: function(rect) {
            alert(rect + ' Center point: ' + rect.getCenter() + ' Degree rotation: ' + rect.getDegreeRotation());
        }
    });
});
