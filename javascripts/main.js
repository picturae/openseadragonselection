var viewer, selection, rgb, levels, filters, magnifier;
document.addEventListener('DOMContentLoaded', function() {
    viewer = OpenSeadragon({
        id: 'contentDiv',
        prefixUrl: 'images/buttons/',
        crossOriginPolicy: 'Anonymous',
        defaultZoomLevel: 1.1,
        //zoomLevels: [0.04, 0.05, 0.07, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 1], //only for Picturae fork of openseadragon
        tileSources: 'http://openseadragon.github.io/example-images/highsmith/highsmith.dzi',
        minZoomImageRatio: 0.1, // of viewer size
        //navigationControlAnchor: OpenSeadragon.ControlAnchor.BOTTOM_LEFT,
        immediateRender: true
    });
    selection =viewer.selection({
        onSelection: function(rect) {
            alert(rect + ' Center point: ' + rect.getCenter() + ' Degree rotation: ' + rect.getDegreeRotation());
        }
    });
    rgb = viewer.rgb({ //does not work in fullscreen since elements do not exist in fullscreen
        onCanvasHover: function(color) {
            document.getElementById('r').value = color.r;
            document.getElementById('g').value = color.g;
            document.getElementById('b').value = color.b;
            document.getElementById('a').value = color.a;

            document.getElementById('img').checked = !!color.image;
        }
    });

    levels = viewer.zoomLevels({
        levels: [0.04, 0.05, 0.07, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 1]
        // levels: [0.1, 1]
    });
    var zoomView = $('#zoom');
    viewer.addHandler('zoom', function(e) {
        var percentage = viewer.world.getItemAt(0).viewportToImageZoom(e.zoom);
        zoomView.val(percentage.toFixed(2));
    });

    filters = viewer.imagefilters();

    magnifier = viewer.magnifier().toggleVisibility();

    var active = $('#tabs > div').index($('#tabs-' + location.hash.substring(1)));
    $('#tabs').tabs({active: active === -1 ? null : active});
});
