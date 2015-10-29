document.addEventListener('DOMContentLoaded', function() {
    var viewer = OpenSeadragon({
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
    });
    viewer.selection({
        onSelection: function(rect) {
            alert(rect + ' Center point: ' + rect.getCenter() + ' Degree rotation: ' + rect.getDegreeRotation());
        }
    });
    viewer.rgb({
        onMouseMove: function(color) {
            document.getElementById('r').value = color.r;
            document.getElementById('g').value = color.g;
            document.getElementById('b').value = color.b;
        }
    });
});
