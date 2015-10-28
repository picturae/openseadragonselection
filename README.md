# OpenSeadragonSelection

An OpenSeadragon plugin that provides functionality for selecting a rectangular part of an image.

## Demo

http://picturae.github.io/openseadragonselection/

## Usage

Include `dist/openseadragonselection.js` after OpenSeadragon in your html. Then after you create a viewer:

    viewer.selection(options);

## Options

    viewer.selection({
        element:              null, // html element to use for overlay
        showSelectionControl: true, // @TODO show button to toggle selection mode
        keyboardShortcut:     'c', // key to toggle selection mode
        rect:                 null, // initial selection as an OpenSeadragon.SelectionRect object
        onSelection:          function() {},
    });

## To do

    - fix behavior when the viewer itself is rotated
    - test/fix with multiple images at once
