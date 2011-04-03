<?php

    $games = array();
    $dir = glob('*.json');

    foreach($dir as $name) {
        $games[] = substr($name, 0, strpos($name, '.'));
    }

    echo implode(',', $games);
