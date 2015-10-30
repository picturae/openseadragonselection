var viewer, selection, rgb;
document.addEventListener('DOMContentLoaded', function() {
    viewer = OpenSeadragon({
        id: 'contentDiv',
        prefixUrl: 'images/buttons/',
        crossOriginPolicy: 'Anonymous',
        defaultZoomLevel: 0,
        tileSources: 'http://openseadragon.github.io/example-images/highsmith/highsmith.dzi',
    });
    selection =viewer.selection({
        onSelection: function(rect) {
            alert(rect + ' Center point: ' + rect.getCenter() + ' Degree rotation: ' + rect.getDegreeRotation());
        }
    });
    rgb = viewer.rgb({
        onCanvasHover: function(color) {
            document.getElementById('r').value = color.r;
            document.getElementById('g').value = color.g;
            document.getElementById('b').value = color.b;
            document.getElementById('a').value = color.a;

            document.getElementById('img').checked = !!color.image;
        }
    });
});
